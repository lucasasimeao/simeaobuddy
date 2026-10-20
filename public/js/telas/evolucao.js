// Evolução: peso (pontos + média de 7 dias), medidas, tonelagem por microciclo/treino/exercício, e1RM e status.
// O aluno vê os próprios dados; o admin escolhe a pessoa (#/evolucao/ID).
import { api, ehAdmin, sessao } from '../api.js';
import { esc } from '../componentes.js';
import { chipStatus, chipFadiga } from '../programa-ui.js';
import { mediaMovel7, MEDIDAS } from '/js/treino/corpo.js';
import { peso as graficoPeso, linha, colunas, tabela, numero, dataCurta } from '../graficos.js';

export const titulo = 'Evolução';

const vazio = (texto) => `<p class="sub">${texto}</p>`;
const kg = (n) => `${numero(n)} kg`;

export async function render(tela, params) {
  const alvo = Number(params[0]) || sessao.usuario.id;
  const [ev, pessoas] = await Promise.all([
    api(`/evolucao${alvo !== sessao.usuario.id ? `?aluno_id=${alvo}` : ''}`),
    ehAdmin() ? api('/alunos').then((r) => r.alunos.filter((a) => a.status === 'ativo')) : [],
  ]);
  // Contêiner próprio: os eventos vão embora junto quando a tela muda (o #tela é reaproveitado)
  const el = document.createElement('div');
  el.className = 'pilha';
  tela.replaceChildren(el);

  const { corpo } = ev;
  const serie = mediaMovel7(corpo.pesos);
  const camposComDado = MEDIDAS.filter((c) => corpo.medidas.some((m) => m[c.campo] != null));
  const codigos = [...new Set(ev.treinos.map((t) => t.codigo))].sort();
  let medida = camposComDado[0]?.campo;
  let codigo = codigos[0];
  let exercicioId = ev.exercicios[0]?.id;

  el.innerHTML = `
    ${ehAdmin() ? `<div class="filtros"><select id="pessoa" aria-label="De quem">
      <option value="${sessao.usuario.id}">${esc(sessao.usuario.nome)} (você)</option>
      ${pessoas.map((p) => `<option value="${p.id}" ${p.id === alvo ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}
    </select></div>` : ''}

    <section class="card">
      <div class="linha-titulo"><h2>Peso</h2>${corpo.avaliacao.ultimo ? `<span class="sub num">média ${kg(corpo.avaliacao.ultimo.media)}</span>` : ''}</div>
      ${serie.length ? `
        <div class="legenda"><span><i class="chave-linha"></i>Média de 7 dias</span><span><i class="chave-ponto"></i>Peso do dia</span></div>
        <div class="grafico"><canvas id="g-peso" role="img" aria-label="Gráfico do peso"></canvas></div>
        ${corpo.avaliacao.mensagem ? `<p class="${corpo.avaliacao.alerta ? 'aviso-texto' : 'sub'}">${corpo.avaliacao.alerta ? '⚠ ' : ''}${esc(corpo.avaliacao.mensagem)}</p>` : ''}
        ${tabela(['Data', 'Peso (kg)', 'Média 7 dias'], [...serie].reverse().map((p) => [dataCurta(p.data), numero(p.peso), numero(p.media)]))}`
        : vazio('Nenhum peso registrado. Registre na tela Corpo.')}
    </section>

    <section class="card">
      <h2>Medidas</h2>
      ${camposComDado.length ? `
        <div class="segmentos rolar" role="tablist">${camposComDado.map((c) => `<button role="tab" data-medida="${c.campo}" aria-selected="${c.campo === medida}">${esc(c.texto)}</button>`).join('')}</div>
        <div class="grafico"><canvas id="g-medida" role="img" aria-label="Gráfico da medida"></canvas></div>
        <div id="t-medida"></div>` : vazio('Nenhuma medida registrada ainda.')}
    </section>

    <section class="card">
      <h2>Tonelagem por microciclo</h2>
      ${ev.micros.length ? `
        <p class="sub">Todos os treinos de cada microciclo somados (kg × reps das séries válidas).</p>
        <div class="grafico"><canvas id="g-micro" role="img" aria-label="Tonelagem por microciclo"></canvas></div>
        <div class="tabela-rolavel"><table class="tabela num">
          <thead><tr><th>Micro</th><th>Tonelagem</th><th>🟢</th><th>🟡</th><th>🔴</th><th>Fadiga</th></tr></thead>
          <tbody>${ev.micros.map((m) => `<tr><td>${m.microciclo}</td><td>${numero(m.tonelagem, 0)}</td>
            <td>${m.fadiga.progrediram}</td><td>${m.fadiga.mantiveram}</td><td>${m.fadiga.regrediram}</td>
            <td>${chipFadiga(m.fadiga) || '<span class="sub">base</span>'}</td></tr>`).join('')}</tbody>
        </table></div>
        <p class="dica">🟢 progrediu · 🟡 manteve · 🔴 regrediu: quantos exercícios, contra o microciclo anterior.</p>`
        : vazio('Ainda não tem treino finalizado.')}
    </section>

    ${codigos.length ? `<section class="card">
      <h2>Tonelagem por treino</h2>
      <div class="segmentos rolar" role="tablist">${codigos.map((c) => `<button role="tab" data-codigo="${esc(c)}" aria-selected="${c === codigo}">Treino ${esc(c)}</button>`).join('')}</div>
      <div class="grafico"><canvas id="g-treino" role="img" aria-label="Tonelagem do treino"></canvas></div>
    </section>` : ''}

    ${ev.exercicios.length ? `<section class="card">
      <h2>Por exercício</h2>
      <div class="filtros"><select id="exercicio" aria-label="Exercício">${ev.exercicios.map((e) => `<option value="${e.id}">${esc(e.nome)}</option>`).join('')}</select></div>
      <h3 class="sub-titulo">Força estimada (e1RM)</h3>
      <div class="grafico"><canvas id="g-e1rm" role="img" aria-label="e1RM do exercício"></canvas></div>
      <h3 class="sub-titulo">Tonelagem</h3>
      <div class="grafico baixo"><canvas id="g-ex-ton" role="img" aria-label="Tonelagem do exercício"></canvas></div>
      <div id="t-exercicio"></div>
      <p class="dica">e1RM = kg × (1 + (reps + RIR) / 30), a melhor série de cada treino.</p>
    </section>` : ''}`;

  // --- gráficos ---
  if (serie.length) graficoPeso(el.querySelector('#g-peso'), serie);

  function desenharMedida() {
    if (!medida) return;
    const c = MEDIDAS.find((x) => x.campo === medida);
    const unidade = c.unidade || ' cm';
    const pts = corpo.medidas.filter((m) => m[medida] != null).map((m) => ({ x: dataCurta(m.data), y: m[medida] }));
    linha(el.querySelector('#g-medida'), pts, { rotulo: c.texto, unidade });
    el.querySelector('#t-medida').innerHTML = tabela(['Data', c.texto], [...pts].reverse().map((p) => [p.x, `${numero(p.y)}${unidade}`]));
  }
  desenharMedida();

  if (ev.micros.length) colunas(el.querySelector('#g-micro'), ev.micros.map((m) => ({ x: `Micro ${m.microciclo}`, y: m.tonelagem })), { rotulo: 'Tonelagem', unidade: ' kg' });

  function desenharTreino() {
    if (!codigo) return;
    const pts = ev.treinos.filter((t) => t.codigo === codigo).map((t) => ({ x: `M${t.microciclo} · ${dataCurta(t.data)}`, y: t.tonelagem }));
    colunas(el.querySelector('#g-treino'), pts, { rotulo: `Treino ${codigo}`, unidade: ' kg' });
  }
  desenharTreino();

  function desenharExercicio() {
    const ex = ev.exercicios.find((e) => e.id === exercicioId);
    if (!ex) return;
    linha(el.querySelector('#g-e1rm'), ex.historico.map((h) => ({ x: dataCurta(h.data), y: h.e1rm })), { rotulo: 'e1RM', unidade: ' kg' });
    colunas(el.querySelector('#g-ex-ton'), ex.historico.map((h) => ({ x: dataCurta(h.data), y: h.tonelagem })), { rotulo: 'Tonelagem', unidade: ' kg' });
    el.querySelector('#t-exercicio').innerHTML = `<div class="tabela-rolavel"><table class="tabela num">
      <thead><tr><th>Data</th><th>Treino</th><th>Top</th><th>e1RM</th><th>Tonelagem</th><th>Status</th></tr></thead>
      <tbody>${[...ex.historico].reverse().map((h) => `<tr><td>${dataCurta(h.data)}</td><td>${esc(h.codigo)} · M${h.microciclo}</td>
        <td>${h.carga != null ? `${numero(h.carga)} × ${h.reps}` : '—'}</td><td>${numero(h.e1rm)}</td><td>${numero(h.tonelagem, 0)}</td>
        <td>${chipStatus(h.status) || '—'}</td></tr>`).join('')}</tbody>
    </table></div>`;
  }
  desenharExercicio();

  // --- eventos ---
  el.querySelector('#pessoa')?.addEventListener('change', (e) => { location.hash = `#/evolucao/${e.target.value}`; });
  el.querySelector('#exercicio')?.addEventListener('change', (e) => { exercicioId = Number(e.target.value); desenharExercicio(); });
  el.addEventListener('click', (e) => {
    const m = e.target.closest('[data-medida]');
    const c = e.target.closest('[data-codigo]');
    if (m) {
      medida = m.dataset.medida;
      for (const b of el.querySelectorAll('[data-medida]')) b.setAttribute('aria-selected', String(b === m));
      desenharMedida();
    }
    if (c) {
      codigo = c.dataset.codigo;
      for (const b of el.querySelectorAll('[data-codigo]')) b.setAttribute('aria-selected', String(b === c));
      desenharTreino();
    }
  });
}
