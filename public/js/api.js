// Conversa com o servidor. Erros viram mensagens amigáveis (erro.message).
export async function api(caminho, { metodo = 'GET', corpo } = {}) {
  let r;
  try {
    r = await fetch(`/api${caminho}`, {
      method: metodo,
      headers: corpo ? { 'Content-Type': 'application/json' } : {},
      body: corpo ? JSON.stringify(corpo) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw new Error('Sem conexão com o servidor. Confira a internet.');
  }
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    const erro = new Error(dados.erro || 'Algo deu errado. Tente de novo.');
    erro.status = r.status;
    erro.pendente = dados.pendente;
    throw erro;
  }
  return dados;
}

// Usuário logado (preenchido pelo app.js ao abrir)
export const sessao = { usuario: null };
export const ehAdmin = () => sessao.usuario?.papel === 'admin';
