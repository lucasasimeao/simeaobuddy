// Offline: a ficha do treino fica guardada no celular (IndexedDB) e as séries vão para uma fila
// que é enviada quando a internet volta. As regras da fila ficam em offline-regras.js.
import { api } from './api.js';
import { chaveDe, pedidoDe, aplicarPendentes, ehSemRede } from './offline-regras.js';

const BANCO = 'simeaobuddy';

let conexao = null;
function abrir() {
  if (conexao) return conexao;
  conexao = new Promise((ok, falha) => {
    const pedido = indexedDB.open(BANCO, 1);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      db.createObjectStore('fichas'); // treino_id → ficha
      db.createObjectStore('fila', { keyPath: 'seq', autoIncrement: true });
    };
    pedido.onsuccess = () => ok(pedido.result);
    pedido.onerror = () => { conexao = null; falha(pedido.error); };
  });
  return conexao;
}

async function transacao(loja, modo, fazer) {
  const db = await abrir();
  return new Promise((ok, falha) => {
    const tx = db.transaction(loja, modo);
    let resultado;
    Promise.resolve(fazer(tx.objectStore(loja))).then((r) => { resultado = r; });
    tx.oncomplete = () => ok(resultado);
    tx.onerror = () => falha(tx.error);
    tx.onabort = () => falha(tx.error);
  });
}
const pedir = (req) => new Promise((ok, falha) => { req.onsuccess = () => ok(req.result); req.onerror = () => falha(req.error); });

// ---------- Ficha guardada ----------
// Guarda sem as marcas de "pendente" (quem diz o que está pendente é a fila)
export async function guardarFicha(ficha) {
  const limpa = structuredClone(ficha);
  for (const item of limpa.itens || []) item.registradas = (item.registradas || []).map(({ pendente, ...s }) => s);
  try { await transacao('fichas', 'readwrite', (s) => s.put(limpa, limpa.treino.id)); } catch { /* sem IndexedDB: segue sem cópia */ }
}
export async function lerFicha(treinoId) {
  try { return await transacao('fichas', 'readonly', (s) => pedir(s.get(treinoId))); } catch { return null; }
}

// ---------- Fila ----------
export async function pendentes(treinoId = null) {
  try {
    const todas = await transacao('fila', 'readonly', (s) => pedir(s.getAll()));
    return treinoId == null ? todas : todas.filter((o) => o.treino_id === treinoId);
  } catch { return []; }
}

async function enfileirar(op) {
  const chave = chaveDe(op);
  await transacao('fila', 'readwrite', async (s) => {
    const todas = await pedir(s.getAll());
    for (const o of todas) if (o.chave === chave) s.delete(o.seq);
    s.add({ ...op, chave, criado: Date.now() });
  });
  avisarMudanca();
}

async function tirar(seq) {
  await transacao('fila', 'readwrite', (s) => s.delete(seq));
}

// Envia a fila em ordem. Para no primeiro erro de rede (o resto espera a próxima vez).
// Devolve { resultados: Map(chave → resposta), erros: Map(chave → mensagem), semRede }
let emAndamento = null;
export function sincronizar() {
  if (!emAndamento) emAndamento = enviarFila().finally(() => { emAndamento = null; avisarMudanca(); });
  return emAndamento;
}

async function enviarFila() {
  const resultados = new Map();
  const erros = new Map();
  let semRede = false;
  for (const op of (await pendentes()).sort((a, b) => a.seq - b.seq)) {
    // A operação pode ter sido trocada por uma mais nova enquanto a fila andava
    const atual = (await pendentes()).find((o) => o.seq === op.seq);
    if (!atual) continue;
    const { caminho, metodo, corpo } = pedidoDe(op);
    try {
      resultados.set(op.chave, await api(caminho, { metodo, corpo }));
      await tirar(op.seq);
    } catch (erro) {
      if (ehSemRede(erro) || erro.status === 401 || erro.status >= 500) { semRede = ehSemRede(erro) || erro.status >= 500; break; }
      // Erro de validação: não adianta reenviar
      erros.set(op.chave, erro.message);
      await tirar(op.seq);
    }
  }
  return { resultados, erros, semRede };
}

// Salva via fila: tenta enviar na hora; sem internet, fica guardado.
// Devolve { ok: true, resposta } | { pendente: true } | { erro }
export async function enviar(op) {
  try {
    await enfileirar(op);
  } catch {
    // Sem IndexedDB (navegador antigo / modo privado): manda direto
    const { caminho, metodo, corpo } = pedidoDe(op);
    try { return { ok: true, resposta: await api(caminho, { metodo, corpo }) }; } catch (erro) { return { erro: erro.message }; }
  }
  const { resultados, erros } = await sincronizar();
  const chave = chaveDe(op);
  if (resultados.has(chave)) return { ok: true, resposta: resultados.get(chave) };
  if (erros.has(chave)) return { erro: erros.get(chave) };
  return { pendente: true };
}

// Ficha com o que ainda não subiu aplicado por cima
export async function comPendentes(ficha) {
  return aplicarPendentes(ficha, await pendentes(ficha.treino.id));
}

// ---------- Indicador no topo ----------
async function avisarMudanca() {
  const fila = await pendentes();
  const n = fila.length;
  window.dispatchEvent(new CustomEvent('fila-mudou', { detail: { fila } }));
  const el = document.getElementById('rede');
  if (!el) return;
  const offline = !navigator.onLine;
  el.hidden = !n && !offline;
  el.classList.toggle('offline', offline);
  el.textContent = n ? `${n} para enviar` : 'Sem internet';
  el.title = n ? 'Séries guardadas no celular. Vão subir sozinhas quando a internet voltar.' : 'Sem internet: o que você salvar fica no celular.';
}

// Tenta de novo: quando a internet volta, quando o app volta para a frente e a cada 30 s se tiver pendência
export function iniciarOffline() {
  window.addEventListener('online', () => sincronizar());
  window.addEventListener('offline', avisarMudanca);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sincronizar(); });
  setInterval(async () => { if ((await pendentes()).length) sincronizar(); }, 30000);
  sincronizar();
}

// Ao sair da conta: apaga o que está guardado no celular (fichas e cache das telas)
export async function limparDadosLocais() {
  try { await transacao('fichas', 'readwrite', (s) => s.clear()); } catch { /* nada */ }
  if ('caches' in window) for (const k of await caches.keys()) if (k.startsWith('api-')) await caches.delete(k);
}
