// Service worker do SIMEAOBuddy. O servidor preenche ARQUIVOS e VERSAO (src/pwa/service-worker.js):
// mudou algum arquivo do app → versão nova → o celular baixa tudo de novo sozinho.
const VERSAO = '__VERSAO__';
const ARQUIVOS = __ARQUIVOS__;
const APP = `app-${VERSAO}`;
const API = 'api-v1';
const FONTES = 'fontes-v1';
const ESPERA_MS = 5000; // Wi-Fi ruim da academia: depois de 5 s usa a cópia guardada

// API que nunca vai para o cache: arquivos grandes, login e a ficha do treino (essa fica no IndexedDB)
const SEM_CACHE = [/^\/api\/backup/, /^\/api\/exportar/, /^\/api\/corpo\/fotos/, /^\/api\/auth\/(?!eu$)/, /^\/api\/treinos\/\d+/];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(APP).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('app-') && k !== APP) await caches.delete(k);
    await self.clients.claim();
  })());
});

function comPrazo(promessa, ms) {
  return new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error('demorou')), ms);
    promessa.then((r) => { clearTimeout(t); ok(r); }, (e) => { clearTimeout(t); falha(e); });
  });
}

const semRede = () => new Response(JSON.stringify({ erro: 'Sem conexão com o servidor. Confira a internet.', offline: true }),
  { status: 503, headers: { 'Content-Type': 'application/json' } });

// API (GET): rede primeiro; sem rede, a última resposta guardada
async function api(req) {
  const cache = await caches.open(API);
  try {
    const r = await comPrazo(fetch(req), ESPERA_MS);
    if (r.ok) cache.put(req, r.clone());
    return r;
  } catch {
    return (await cache.match(req)) || semRede();
  }
}

// Telas, CSS e JS: a cópia da versão atual; o que não estiver guardado vai para a rede
async function arquivo(req) {
  const cache = await caches.open(APP);
  const guardado = await cache.match(req, { ignoreSearch: true });
  if (guardado) return guardado;
  try {
    return await fetch(req);
  } catch {
    return new Response('Sem conexão.', { status: 503 });
  }
}

// Página: rede primeiro (pega versão nova rápido); sem rede, o index.html guardado
async function pagina(req) {
  try {
    return await comPrazo(fetch(req), ESPERA_MS);
  } catch {
    return (await caches.match('/index.html')) || new Response('Sem conexão.', { status: 503 });
  }
}

// Fonte Inter do Google: guarda na primeira vez
async function fonte(req) {
  const cache = await caches.open(FONTES);
  const guardado = await cache.match(req);
  if (guardado) return guardado;
  try {
    const r = await fetch(req);
    if (r.ok || r.type === 'opaque') cache.put(req, r.clone());
    return r;
  } catch {
    return new Response('', { status: 503 });
  }
}

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return; // gravações: a fila do app cuida (js/offline.js)
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return ev.respondWith(fonte(req));
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) {
    if (SEM_CACHE.some((r) => r.test(url.pathname))) return;
    return ev.respondWith(api(req));
  }
  if (req.mode === 'navigate') return ev.respondWith(pagina(req));
  ev.respondWith(arquivo(req));
});

