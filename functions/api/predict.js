/**
 * Cloudflare Pages Function: /api/predict
 * Guarda el pronóstico de UN partido aplicando reglas en el servidor:
 *  - La identidad sale del token (cada quien solo escribe lo suyo).
 *  - El partido debe existir, no haber terminado y no haber comenzado (cierre al saque).
 *  - Si ya existe un pronóstico para ese partido, NO se puede cambiar (inmutable).
 *
 * Env: TENANT_ID, CLIENT_ID (opcional), QUINIELA_KV
 */

function b64url(s){ return s.replace(/-/g,'+').replace(/_/g,'/'); }
function decodeJwt(token){
  const p = token.split('.');
  if(p.length !== 3) return null;
  try{ return { hdr:JSON.parse(atob(b64url(p[0]))), payload:JSON.parse(atob(b64url(p[1]))), raw:p }; }
  catch(e){ return null; }
}
let _jwks=null,_jwksAt=0;
async function getJwks(tenantId){
  if(_jwks && Date.now()-_jwksAt < 3_600_000) return _jwks;
  const r = await fetch(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`);
  _jwks = await r.json(); _jwksAt = Date.now(); return _jwks;
}
async function verifyToken(token, tenantId, clientId){
  const d = decodeJwt(token); if(!d) return null;
  const { hdr, payload, raw } = d;
  if(payload.tid !== tenantId) return null;
  if(clientId && payload.aud !== clientId) return null;
  if(Date.now()/1000 > payload.exp + 30) return null;
  if(!['login.microsoftonline.com','sts.windows.net'].some(iss => (payload.iss||'').includes(iss))) return null;
  try{
    const jwks = await getJwks(tenantId);
    const jwk = (jwks.keys||[]).find(k => k.kid === hdr.kid); if(!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name:'RSASSA-PKCS1-v1_5', hash:'SHA-256' }, false, ['verify']);
    const msg = new TextEncoder().encode(raw[0]+'.'+raw[1]);
    const sig = Uint8Array.from(atob(b64url(raw[2])), c => c.charCodeAt(0));
    if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig, msg)) return null;
  }catch(e){ return null; }
  return payload;
}
function corsHeaders(request, env){
  const allowed = env.APP_ORIGIN || new URL(request.url).origin;
  return { 'Access-Control-Allow-Origin':allowed, 'Access-Control-Allow-Methods':'POST, OPTIONS',
           'Access-Control-Allow-Headers':'Authorization, Content-Type', 'Vary':'Origin' };
}
function json(data, status, cors){ return new Response(JSON.stringify(data), {status, headers:{...cors,'Content-Type':'application/json'}}); }

export async function onRequest({ request, env }){
  const CORS = corsHeaders(request, env);
  if(request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if(request.method !== 'POST')   return json({ error:'método no permitido' }, 405, CORS);

  const TENANT_ID = env.TENANT_ID, CLIENT_ID = env.CLIENT_ID, KV = env.QUINIELA_KV;
  if(!TENANT_ID || !KV) return json({ error:'config del servidor incompleta' }, 500, CORS);

  const token = (request.headers.get('Authorization') || '').replace(/^Bearer /,'');
  const claims = await verifyToken(token, TENANT_ID, CLIENT_ID);
  if(!claims) return json({ error:'No autorizado' }, 401, CORS);
  const userId = claims.oid || claims.sub;

  let body; try{ body = await request.json(); }catch(e){ return json({ error:'cuerpo inválido' }, 400, CORS); }
  const matchId = body && body.matchId;
  const A = parseInt(body && body.a, 10), B = parseInt(body && body.b, 10);
  if(typeof matchId !== 'string') return json({ error:'falta matchId' }, 400, CORS);
  if(!Number.isInteger(A) || !Number.isInteger(B) || A<0 || B<0 || A>99 || B>99)
    return json({ error:'marcador inválido' }, 400, CORS);

  // El partido debe estar abierto
  const matchesRaw = await KV.get('quiniela:matches');
  const matches = matchesRaw ? JSON.parse(matchesRaw) : [];
  const m = matches.find(x => x.id === matchId);
  if(!m) return json({ error:'el partido no existe' }, 404, CORS);
  if(m.finished) return json({ error:'el partido ya terminó' }, 403, CORS);
  if(Date.now() >= new Date(m.kickoff).getTime()) return json({ error:'el partido ya comenzó' }, 403, CORS);

  // Inmutable: si ya hay pronóstico para este partido, no se cambia
  const key = 'quiniela:preds:' + userId;
  const raw = await KV.get(key);
  const mine = raw ? JSON.parse(raw) : {};
  if(mine[matchId]) return json({ error:'ya enviaste tu pronóstico para este partido' }, 403, CORS);

  mine[matchId] = { a:A, b:B };
  await KV.put(key, JSON.stringify(mine));
  return json({ ok:true }, 200, CORS);
}
