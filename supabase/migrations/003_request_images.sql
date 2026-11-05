BEGIN;
ALTER TABLE public.support_requests ADD COLUMN IF NOT EXISTS image_path text;
-- Cada llamada RPC constituye una transacción. Solo la clave secreta de NestJS puede ejecutarla.
CREATE OR REPLACE FUNCTION public.support_api(p_operation text, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  old_row public.support_requests%ROWTYPE;
  new_row public.support_requests%ROWTYPE;
  result jsonb;
  requested_id uuid;
  next_status text;
  actor_name text;
  note text;
  changed jsonb := '{}'::jsonb;
  field_name text;
  sort_expression text;
  direction text;
  page_number integer;
  page_limit integer;
BEGIN
  IF p_operation='health' THEN
    PERFORM 1 FROM public.support_requests LIMIT 1;
    PERFORM 1 FROM public.request_history LIMIT 1;
    RETURN jsonb_build_object('status','ok','database','Supabase PostgreSQL');
  END IF;
  IF p_operation='list' THEN
    page_number := coalesce((p_payload->>'page')::integer,1);
    page_limit := coalesce((p_payload->>'limit')::integer,8);
    IF page_number<1 OR page_number>1000000 OR page_limit<1 OR page_limit>100 THEN
      RAISE EXCEPTION USING ERRCODE='PT400',MESSAGE='Paginación inválida.';
    END IF;
    sort_expression := CASE coalesce(p_payload->>'sort','created_at')
      WHEN 'title' THEN 'title' WHEN 'updated_at' THEN 'updated_at'
      WHEN 'priority' THEN 'CASE priority WHEN ''Crítica'' THEN 4 WHEN ''Alta'' THEN 3 WHEN ''Media'' THEN 2 ELSE 1 END'
      ELSE 'created_at' END;
    direction := CASE WHEN p_payload->>'order'='asc' THEN 'ASC' ELSE 'DESC' END;
    -- Expresiones de orden cerradas; todos los filtros se pasan como parámetros.
    EXECUTE format($query$
      WITH filtered AS MATERIALIZED (
        SELECT * FROM public.support_requests r
        WHERE (nullif($1->>'status','') IS NULL OR r.status=$1->>'status')
          AND (nullif($1->>'category','') IS NULL OR r.category=$1->>'category')
          AND (nullif($1->>'priority','') IS NULL OR r.priority=$1->>'priority')
          AND (nullif($1->>'q','') IS NULL
            OR strpos(lower(r.title),lower($1->>'q'))>0
            OR strpos(lower(r.description),lower($1->>'q'))>0
            OR strpos(lower(r.requester),lower($1->>'q'))>0)
      ), paged AS (
        SELECT * FROM filtered ORDER BY %s %s,id ASC LIMIT $2 OFFSET $3
      )
      SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(to_jsonb(paged)) FROM paged),'[]'::jsonb),
        'total',(SELECT count(*) FROM filtered),'page',$4,'limit',$2)
    $query$,sort_expression,direction)
    INTO result USING p_payload,page_limit,(page_number-1)*page_limit,page_number;
    RETURN result;
  END IF;
  IF p_operation='create' THEN
    INSERT INTO public.support_requests(title,description,requester,category,priority)
    VALUES(trim(p_payload->>'title'),trim(p_payload->>'description'),trim(p_payload->>'requester'),p_payload->>'category',p_payload->>'priority')
    RETURNING * INTO new_row;
    INSERT INTO public.request_history(request_id,kind,to_status,actor,observation)
    VALUES(new_row.id,'Creación','Pendiente',new_row.requester,'Solicitud registrada');
    RETURN to_jsonb(new_row);
  END IF;
  IF p_operation='image' THEN
    requested_id := (p_payload->>'id')::uuid;
    SELECT * INTO old_row FROM public.support_requests WHERE id=requested_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='PT404',MESSAGE='La solicitud no existe.'; END IF;
    IF old_row.status IN ('Resuelta','Cancelada') THEN
      RAISE EXCEPTION USING ERRCODE='PT409',MESSAGE='Una solicitud cerrada no permite modificar su imagen.';
    END IF;
    actor_name := trim(p_payload->>'actor');
    IF actor_name IS NULL OR length(actor_name) NOT BETWEEN 2 AND 100 THEN
      RAISE EXCEPTION USING ERRCODE='PT400',MESSAGE='Indica un responsable válido.';
    END IF;
    note := nullif(p_payload->>'path','');
    IF note IS NOT NULL AND note !~ ('^' || requested_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$') THEN
      RAISE EXCEPTION USING ERRCODE='PT400',MESSAGE='Referencia de imagen inválida.';
    END IF;
    UPDATE public.support_requests SET image_path=note,updated_at=clock_timestamp()
    WHERE id=requested_id RETURNING * INTO new_row;
    IF old_row.image_path IS DISTINCT FROM note THEN
      INSERT INTO public.request_history(request_id,kind,from_status,to_status,actor,observation,changes)
      VALUES(requested_id,'Edición',old_row.status,old_row.status,actor_name,
        CASE WHEN note IS NULL THEN 'Imagen retirada' ELSE 'Imagen adjunta actualizada' END,
        jsonb_build_object('image_path',jsonb_build_object('before',old_row.image_path,'after',note)));
    END IF;
    RETURN to_jsonb(new_row) || jsonb_build_object('previous_image_path',old_row.image_path);
  END IF;
  IF p_operation NOT IN ('detail','history','update','status') THEN
    RAISE EXCEPTION USING ERRCODE='PT400',MESSAGE='Operación desconocida.';
  END IF;
  requested_id := (p_payload->>'id')::uuid;
  IF p_operation IN ('update','status') THEN
    SELECT * INTO old_row FROM public.support_requests WHERE id=requested_id FOR UPDATE;
  ELSE
    SELECT * INTO old_row FROM public.support_requests WHERE id=requested_id;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='PT404',MESSAGE='La solicitud no existe.'; END IF;
  IF p_operation='detail' THEN RETURN to_jsonb(old_row); END IF;
  IF p_operation='history' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(h) ORDER BY h.created_at DESC,h.id DESC),'[]'::jsonb)
    INTO result FROM public.request_history h WHERE h.request_id=requested_id;
    RETURN result;
  END IF;
  actor_name := trim(p_payload->>'actor');
  IF actor_name IS NULL OR length(actor_name) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION USING ERRCODE='PT400',MESSAGE='Indica un responsable válido.';
  END IF;
  IF p_operation='update' THEN
    IF old_row.status IN ('Resuelta','Cancelada') THEN
      RAISE EXCEPTION USING ERRCODE='PT409',MESSAGE='Una solicitud cerrada no se puede editar.';
    END IF;
    UPDATE public.support_requests SET title=trim(p_payload->>'title'),description=trim(p_payload->>'description'),
      requester=trim(p_payload->>'requester'),category=p_payload->>'category',priority=p_payload->>'priority',updated_at=clock_timestamp()
    WHERE id=requested_id RETURNING * INTO new_row;
    FOREACH field_name IN ARRAY ARRAY['title','description','requester','category','priority'] LOOP
      IF (to_jsonb(old_row)->field_name) IS DISTINCT FROM (to_jsonb(new_row)->field_name) THEN
        changed := changed || jsonb_build_object(field_name,jsonb_build_object('before',to_jsonb(old_row)->field_name,'after',to_jsonb(new_row)->field_name));
      END IF;
    END LOOP;
    INSERT INTO public.request_history(request_id,kind,from_status,to_status,actor,observation,changes)
    VALUES(requested_id,'Edición',old_row.status,old_row.status,actor_name,'Edición de solicitud',changed);
    RETURN to_jsonb(new_row);
  END IF;
  next_status := p_payload->>'status';
  note := nullif(trim(p_payload->>'observation'),'');
  IF NOT coalesce((old_row.status='Pendiente' AND next_status IN ('En progreso','Cancelada'))
    OR (old_row.status='En progreso' AND next_status='Resuelta'),false) THEN
    RAISE EXCEPTION USING ERRCODE='PT400',MESSAGE='Transición de estado no permitida.';
  END IF;
  IF old_row.priority='Crítica' AND next_status='Resuelta' AND note IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='PT400',MESSAGE='Una solicitud crítica requiere una observación para resolverse.';
  END IF;
  IF length(note)>2000 THEN RAISE EXCEPTION USING ERRCODE='PT400',MESSAGE='Observación demasiado larga.'; END IF;
  UPDATE public.support_requests SET status=next_status,updated_at=clock_timestamp()
  WHERE id=requested_id RETURNING * INTO new_row;
  INSERT INTO public.request_history(request_id,kind,from_status,to_status,actor,observation)
  VALUES(requested_id,'Estado',old_row.status,next_status,actor_name,note);
  RETURN to_jsonb(new_row);
END;
$$;
REVOKE ALL ON FUNCTION public.support_api(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.support_api(text,jsonb) TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.support_requests TO service_role;
GRANT SELECT,INSERT ON public.request_history TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.request_history_id_seq TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
