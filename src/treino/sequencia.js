// Qual é o treino do dia (docs/03 item 3): pela sequência, o próximo que falta no microciclo atual.
// Fechou todos os treinos do microciclo → começa o seguinte. Depois da última semana, o bloco se repete.

// Semana da escada para um microciclo (bloco de n semanas que se repete): micro 4 com n = 3 → semana 1
export function semanaDaEscada(microciclo, nSemanas) {
  return ((microciclo - 1) % nSemanas) + 1;
}

// Microciclo atual: o maior com treino finalizado (ou 1)
export function microcicloAtual(finalizados) {
  return finalizados.reduce((m, t) => Math.max(m, t.microciclo), 1);
}

// sessoes: [{ id }] na ordem · finalizados: [{ sessao_id, microciclo }]
// Devolve { sessao_id, microciclo } do próximo treino
export function proximoTreino(sessoes, finalizados) {
  if (!sessoes.length) return null;
  if (!finalizados.length) return { sessao_id: sessoes[0].id, microciclo: 1 };
  const atual = microcicloAtual(finalizados);
  const feitas = new Set(finalizados.filter((t) => t.microciclo === atual).map((t) => t.sessao_id));
  const falta = sessoes.find((s) => !feitas.has(s.id));
  if (falta) return { sessao_id: falta.id, microciclo: atual };
  return { sessao_id: sessoes[0].id, microciclo: atual + 1 };
}

// Quando a pessoa escolhe outro treino: entra no microciclo atual, a não ser que já tenha feito
// esse treino nele (aí conta para o próximo)
export function microcicloParaSessao(sessaoId, finalizados) {
  if (!finalizados.length) return 1;
  const atual = microcicloAtual(finalizados);
  const jaFez = finalizados.some((t) => t.microciclo === atual && t.sessao_id === sessaoId);
  return jaFez ? atual + 1 : atual;
}

// Quais treinos já foram feitos no microciclo atual: Set de sessao_id
export function feitosNoMicrociclo(finalizados, microciclo) {
  return new Set(finalizados.filter((t) => t.microciclo === microciclo).map((t) => t.sessao_id));
}
