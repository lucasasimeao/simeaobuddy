// Regras da fila offline (funções puras, testadas em test/offline.test.js).
// Uma operação: { tipo: 'serie' | 'apagar' | 'finalizar', treino_id, item_id?, posicao?, bloco?, corpo? }

// Mesma série (ou o mesmo "finalizar") → mesma chave: a operação nova substitui a antiga na fila
export function chaveDe(op) {
  return op.tipo === 'finalizar' ? `${op.treino_id}:finalizar` : `${op.treino_id}:${op.item_id}:${op.posicao}:${op.bloco}`;
}

// O pedido HTTP de cada operação
export function pedidoDe(op) {
  const base = `/treinos/${op.treino_id}`;
  if (op.tipo === 'serie') return { caminho: `${base}/series`, metodo: 'PUT', corpo: op.corpo };
  if (op.tipo === 'apagar') return { caminho: `${base}/series?item_id=${op.item_id}&posicao=${op.posicao}&bloco=${op.bloco}`, metodo: 'DELETE' };
  if (op.tipo === 'finalizar') return { caminho: `${base}/finalizar`, metodo: 'POST', corpo: op.corpo };
  throw new Error(`Operação desconhecida: ${op.tipo}`);
}

// Aplica na ficha (cópia) o que ainda está na fila: séries salvas/apagadas e o "finalizado"
export function aplicarPendentes(ficha, ops) {
  const copia = structuredClone(ficha);
  for (const op of ops.filter((o) => o.treino_id === copia.treino.id)) {
    if (op.tipo === 'finalizar') {
      copia.treino.status = 'finalizado';
      if (op.corpo?.observacao != null) copia.treino.observacao = op.corpo.observacao;
      continue;
    }
    const item = copia.itens.find((i) => i.id === op.item_id);
    if (!item) continue;
    const resto = item.registradas.filter((s) => !(s.posicao === op.posicao && s.bloco === op.bloco));
    if (op.tipo === 'apagar') {
      item.registradas = resto;
    } else {
      const tipo = item.semana?.series?.[op.posicao]?.tipo || null;
      item.registradas = resto.concat({
        posicao: op.posicao, bloco: op.bloco, tipo, carga: op.corpo.carga, reps: op.corpo.reps, uuid: op.corpo.uuid, pendente: true,
      });
    }
  }
  return copia;
}

// Erro de rede (sem internet, servidor desligado ou a resposta "sem conexão" do service worker)
export const ehSemRede = (erro) => Boolean(erro?.offline);
