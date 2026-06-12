/**
 * Cloudflare Pages Function: /api/data
 * Operaciones clave-valor sobre QUINIELA_KV (Cloudflare KV).
 * Valida el token de Microsoft (MSAL ID token / RS256) en cada petición.
 *
 * Variables de entorno necesarias (se configuran en el Dashboard de Cloudflare):
 *   TENANT_ID   — ID de directorio (inquilino) de tu organización
 *   QUINIELA_KV — KV Namespace binding (se agrega en Pages → Settings → Functions)
 */

/* ---------- JWT helpers ---------- */
function b64url(s){ return s.replace(/-/g,'+').replace(/_/g,'/'); }
function decodeJwt(token){
  const parts = token.split('.');
  if(parts.length !== 3) return null;
  try{
    const hdr     = JSON.parse(atob(b64url(parts[0])));
    const payload = JSON.parse(atob(b64url(parts[1])));
    return { hdr, payload, raw: parts };
  }catch(e){ return null; }
}

// Caché de JWKS para no fetchear en cada petición
let _jwksCache = null, _jwksCacheAt = 0;
async function getJwks(tenantId){
  if(_jwksCache && Date.now() - _jwksCacheAt < 3_600_000) return _jwksCache;
  const r = await fetch(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`);
  _jwksCache = await r.json();
  _jwksCacheAt = Date.now();
  return _jwksCache;
}

async function verifyToken(token, tenantId){
  const decoded = decodeJwt(token);
  if(!decoded) return null;
  const { hdr, payload, raw } = decoded;

  // Verificaciones básicas de claims
  if(payload.tid !== tenantId) return null;
  if(Date.now() / 1000 > payload.exp + 30) return null; // 30s de margen
  if(!['login.microsoftonline.com','sts.windows.net'].some(iss =>
    (payload.iss||'').includes(iss))) return null;

  // Verificación de firma RS256 con la clave pública del inquilino
  try{
    const jwks = await getJwks(tenantId);
    const jwk = (jwks.keys||[]).find(k => k.kid === hdr.kid);
    if(!jwk) return null;
    const cryptoKey = await crypto.subtle.importKey(
      'jwk', jwk, { name:'RSASSA-PKCS1-v1_5', hash:'SHA-256' }, false, ['verify']
    );
    const msg = new TextEncoder().encode(raw[0]+'.'+raw[1]);
    const sig = Uint8Array.from(atob(b64url(raw[2])), c => c.charCodeAt(0));
    const ok  = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, sig, msg);
    if(!ok) return null;
  }catch(e){ return null; }

  return payload;
}

/* ---------- CORS ---------- */
const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type'
};
function json(data, status=200){
  return new Response(JSON.stringify(data), {status, headers:{...CORS,'Content-Type':'application/json'}});
}

/* ---------- Handler principal ---------- */
export async function onRequest({ request, env }){
  if(request.method === 'OPTIONS') return new Response(null, { headers: CORS });

  // Env vars
  const TENANT_ID = env.TENANT_ID;
  const KV        = env.QUINIELA_KV;
  if(!TENANT_ID) return json({ error:'Falta TENANT_ID en env' }, 500);
  if(!KV)        return json({ error:'Falta el KV binding QUINIELA_KV' }, 500);

  // Autenticación
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if(!token) return json({ error:'No autorizado' }, 401);

  const claims = await verifyToken(token, TENANT_ID);
  if(!claims) return json({ error:'Token inválido o expirado' }, 401);

  const url    = new URL(request.url);
  const method = request.method;

  try{
    /* GET /api/data?key=...    → { key, value }
       GET /api/data?prefix=... → { keys: [...] }  */
    if(method === 'GET'){
      const prefix = url.searchParams.get('prefix');
      if(prefix){
        const list = await KV.list({ prefix });
        return json({ keys: list.keys.map(k => k.name) });
      }
      const key = url.searchParams.get('key');
      if(!key) return json({ error:'falta key' }, 400);
      const val = await KV.get(key);
      if(val === null) return json({ error:'no existe' }, 404);
      return json({ key, value: val });
    }

    /* POST /api/data  body { key, value } → { ok: true } */
    if(method === 'POST'){
      const body = await request.json();
      if(!body?.key) return json({ error:'falta key' }, 400);
      await KV.put(String(body.key), String(body.value ?? ''));
      return json({ ok: true });
    }

    /* DELETE /api/data?key=... → { ok: true } */
    if(method === 'DELETE'){
      const key = url.searchParams.get('key');
      if(!key) return json({ error:'falta key' }, 400);
      await KV.delete(key);
      return json({ ok: true });
    }

    return json({ error:'método no permitido' }, 405);
  }catch(e){
    return json({ error: String(e?.message || e) }, 500);
  }
}
