import { spawn } from 'node:child_process';
const endpoint = 'http://127.0.0.1:3001/api/health';
console.log('Esperando a que NestJS y Supabase estén disponibles…');
const deadline = Date.now() + 60_000;
let ready = false;
while (Date.now() < deadline) {
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(3000) });
    if (response.ok && (await response.json()).status === 'ok') { ready = true; break; }
  } catch { /* The backend can still be compiling or starting. */ }
  await new Promise(resolve => setTimeout(resolve, 750));
}
if (!ready) {
  console.error('La API no estuvo disponible en 60 segundos. Revisa las variables de Supabase y las migraciones.');
  process.exitCode = 1;
} else if (process.argv.includes('--check')) {
  console.log('API disponible.');
} else {
  console.log('API disponible. Iniciando Next.js…');
  const child = spawn(process.execPath, [process.env.npm_execpath, 'run', 'dev', '-w', 'frontend'], { stdio: 'inherit', env: process.env });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.on('error', () => { console.error('No se pudo iniciar Next.js. Ejecuta este comando mediante npm run dev.'); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 0; });
}
