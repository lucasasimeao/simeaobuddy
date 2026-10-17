// Login com Google (OAuth 2.0, fluxo "authorization code", sem bibliotecas).
// Precisa de GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no arquivo .env.

export function googleConfigurado() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function urlDeLogin({ redirectUri, estado }) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: estado,
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

// Troca o código pelo id_token direto com o Google (via TLS + client secret),
// então o conteúdo do token é confiável sem conferir a assinatura.
export async function trocarCodigo({ codigo, redirectUri }) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: codigo,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!r.ok) throw new Error(`Google recusou o código (${r.status})`);
  const { id_token: idToken } = await r.json();
  return lerIdToken(idToken);
}

export function lerIdToken(idToken) {
  const dados = JSON.parse(Buffer.from(String(idToken).split('.')[1] || '', 'base64url').toString('utf8'));
  const emissorOk = ['accounts.google.com', 'https://accounts.google.com'].includes(dados.iss);
  if (!emissorOk || dados.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error('Token do Google inválido');
  if (dados.exp * 1000 < Date.now()) throw new Error('Token do Google expirado');
  if (!dados.email_verified) throw new Error('E-mail do Google não verificado');
  return { googleId: dados.sub, email: dados.email, nome: dados.name || dados.email, foto: dados.picture || null };
}
