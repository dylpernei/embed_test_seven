// Brilliant Earth — Sigma Embed JWT Worker
// Cloudflare Worker: signs a JWT and returns a secure Sigma embed URL.
// Secrets (CLIENT_ID, EMBED_SECRET) are set via wrangler secret put — never in source.

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) });
    }

    try {
      const now = Math.floor(Date.now() / 1000);
      const sessionLength = parseInt(env.SESSION_LENGTH, 10) || 3600;
      const teams = env.EMBED_TEAMS
        ? env.EMBED_TEAMS.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      const payload = {
        sub: env.EMBED_EMAIL,
        iss: env.CLIENT_ID,
        jti: crypto.randomUUID(),
        iat: now,
        exp: now + sessionLength,
        account_type: env.EMBED_ACCOUNT_TYPE || 'Pro',
        teams,
      };

      const token = await signJWT(payload, env.EMBED_SECRET, env.CLIENT_ID);
      const signedUrl = `${env.EMBED_URL}?:jwt=${token}&:embed=true&:menu_position=bottom`;

      return new Response(
        JSON.stringify({ url: signedUrl, expiresIn: sessionLength }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders(env) } }
      );
    } catch (err) {
      console.error('JWT signing error:', err);
      return new Response(
        JSON.stringify({ error: 'Failed to generate embed URL' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(env) } }
      );
    }
  },
};

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

async function signJWT(payload, secret, kid) {
  const header = { alg: 'HS256', typ: 'JWT', kid };
  const encodedHeader  = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput   = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));

  return `${signingInput}.${base64url(signature)}`;
}

function base64url(input) {
  const bytes = typeof input === 'string'
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  const binString = Array.from(bytes, b => String.fromCharCode(b)).join('');
  return btoa(binString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
