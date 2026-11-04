BEGIN;
CREATE TABLE IF NOT EXISTS support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(120) NOT NULL CHECK (length(trim(title)) >= 3),
  description text NOT NULL CHECK (length(trim(description)) BETWEEN 10 AND 5000),
  requester varchar(100) NOT NULL CHECK (length(trim(requester)) >= 2),
  category text NOT NULL CHECK (category IN ('Hardware','Software','Red','Accesos','Otros')),
  priority text NOT NULL CHECK (priority IN ('Baja','Media','Alta','Crítica')),
  status text NOT NULL DEFAULT 'Pendiente' CHECK (status IN ('Pendiente','En progreso','Resuelta','Cancelada')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE IF NOT EXISTS request_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES support_requests(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('Creación','Edición','Estado')),
  from_status text,
  to_status text NOT NULL,
  actor varchar(100) NOT NULL CHECK (length(trim(actor)) >= 2),
  observation text,
  changes jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS requests_created_idx ON support_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS requests_filters_idx ON support_requests(status,priority,category);
CREATE INDEX IF NOT EXISTS history_request_idx ON request_history(request_id,created_at DESC);
-- The browser must never access these tables through Supabase's public REST API.
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON support_requests,request_history FROM anon,authenticated;
COMMIT;
