// Planilha (admin): recria a "PLANILHA AVANÇADO". #/planilha/7 → abas por treino (um bloco por microciclo) + Escada.
// Os kg e reps vêm dos treinos registrados; tonelagem e carga pelas regras de src/treino/.
import { api } from '../api.js';
import { tonelagem, totalReps, cargaUtilizada } from '/js/treino/tonelagem.js';
import { semanaDaEscada } from '/js/treino/sequencia.js';
import { icone } from '../icones.js';
import { esc } from '../componentes.js';
import { faixa, segundos, etiqueta, editarSemana, chipStatus, chipFadiga, varPct } from '../programa-ui.js';

export const titulo = 'Planilha';
export const larga = true;

const MAX_SERIES = 5;

export async function render(el, params) {
  const { programas } = await api('/programas');
  const comPessoa = programas.filter((p) => p.aluno_id);
  const escolhido = Number(params[0]) || (comPessoa.find((p) => p.status === 'ativo') || programas[0])?.id;
  if (!escolhido) {
    el.innerHTML = '<section class="card vazio"><p>Nenhum programa ainda. Crie um em Programas.</p></section>';
    return;
  }
  let dados = await api(`/programas/${escolhido}`);
  const { treinos } = await api(`/treinos/planilha/${escolhido}`);
  let aba = params[1] || String(dados.sessoes[0]?.id || 'escada');
  let prog = aba === 'progressao' ? await api(`/treinos/progressao/${escolhido}`) : null;
  let abaProg = dados.sessoes[0]?.id;

  function desenhar() {
    const { programa, sessoes } = dados;
    const sessao = sessoes.find((s) => String(s.id) === aba);
    el.innerHTML = `
      <div class="filtros">
        <select id="programa" aria-label="Programa">
          ${programas.map((p) => `<option value="${p.id}" ${p.id === programa.id ? 'selected' : ''}>
            ${esc(p.aluno_id ? `${p.aluno_nome} · ${p.nome}${p.status === 'ativo' ? '' : ` (${p.status})`}` : `Modelo · ${p.nome}`)}</option>`).join('')}
        </select>
        <a class="botao" href="#/programas/${programa.id}">${icone('programas')}<span class="so-desktop-inline">Editar</span></a>
      </div>
      <div class="segmentos rolar" role="tablist">
        ${sessoes.map((s) => `<button role="tab" data-aba="${s.id}" aria-selected="${String(s.id) === aba}">Treino ${esc(s.codigo)}</button>`).join('')}
        <button role="tab" data-aba="escada" aria-selected="${aba === 'escada'}">Escada</button>
        <button role="tab" data-aba="progressao" aria-selected="${aba === 'progressao'}">Progressão</button>
      </div>
      ${aba === 'escada' ? escada() : aba === 'progressao' ? progressao() : sessao ? blocos(sessao) : ''}`;

    el.querySelector('#programa').addEventListener('change', (ev) => { location.hash = `#/planilha/${ev.target.value}`; });
    for (const b of el.querySelectorAll('[data-aba]')) {
      b.addEventListener('click', async () => {
        aba = b.dataset.aba;
        if (aba === 'progressao' && !prog) prog = await api(`/treinos/progressao/${escolhido}`);
        desenhar();
      });
    }
    for (const b of el.querySelectorAll('[data-prog]')) b.addEventListener('click', () => { abaProg = Number(b.dataset.prog); desenhar(); });
    for (const b of el.querySelectorAll('[data-celula]')) {
      b.addEventListener('click', async () => {
        const [itemId, semana] = b.dataset.celula.split(':').map(Number);
        const item = dados.sessoes.flatMap((s) => s.itens).find((i) => i.id === itemId);
        const novo = await editarSemana(item, semana, dados.programa.n_microciclos);
        if (novo) { dados = novo; desenhar(); }
      });
    }
  }

  // Um bloco por microciclo, com as colunas da planilha
  function blocos(sessao) {
    const n = dados.programa.n_microciclos;
    const cab = `
      <thead>
        <tr>
          <th rowspan="2" class="fixa">Nº</th><th rowspan="2" class="fixa fixa-2">Exercício</th>
          <th rowspan="2">Séries warm up</th><th rowspan="2">Séries work</th><th rowspan="2">Reps work</th><th rowspan="2">RIR work</th>
          <th rowspan="2">Séries top</th><th rowspan="2">Reps top</th><th rowspan="2">RIR top</th><th rowspan="2">Intervalo</th>
          ${Array.from({ length: MAX_SERIES }, (_, k) => `<th colspan="2">Série ${k + 1}</th>`).join('')}
          <th rowspan="2">Total reps</th><th rowspan="2">Kg</th><th rowspan="2">Tonelagem</th>
        </tr>
        <tr>${Array.from({ length: MAX_SERIES }, () => '<th>Reps</th><th>Kg</th>').join('')}</tr>
      </thead>`;

    const linha = (item, k, m, treino) => {
      const w = item.semanas.find((x) => x.microciclo === semanaDaEscada(m, n));
      const feitas = treino ? treino.series.filter((x) => x.item_id === item.id) : [];
      const celula = (j) => (item.metodo === 'muscle_round' ? feitas.find((x) => x.bloco === j + 1) : feitas.find((x) => x.posicao === j));
      const mr = item.metodo === 'muscle_round';
      // Muscle Round: cada bloco ocupa uma "série" da planilha
      const series = mr ? Array.from({ length: item.mr_blocos || 4 }, () => ({ tipo: 'muscle_round' })) : (w?.series || []);
      const aquecimento = (item.tem_warmup ? 1 : 0) + item.feeders_efetivas.length;
      return `<tr>
        <td class="fixa">${k + 1}</td>
        <td class="fixa fixa-2 nome">${esc(item.exercicio.nome)}</td>
        <td title="${item.tem_warmup ? 'Warm up + ' : ''}${item.feeders_efetivas.length} feeder(s)">${aquecimento}</td>
        <td>${mr ? '—' : w?.n_ws ?? 0}</td><td>${mr ? '—' : faixa(item)}</td><td>${w?.n_ws ? w.rir_ws : '—'}</td>
        <td>${mr ? `${w?.n_mr ?? 0} MR` : w?.n_top ?? 0}${w?.n_bo ? ` + ${w.n_bo} BO` : ''}</td>
        <td>${faixa(item)}</td><td>${w?.n_top ? w.rir_top : '—'}</td><td>${segundos(item.descanso_seg)}</td>
        ${Array.from({ length: MAX_SERIES }, (_, j) => {
          const f = celula(j);
          if (f) return `<td class="feita-cel" title="${f.tipo.toUpperCase()}">${f.reps}</td><td class="feita-cel">${String(f.carga).replace('.', ',')}</td>`;
          return series[j] ? `<td class="vazia">${etiqueta(series[j].tipo)}</td><td class="vazia"></td>` : '<td class="sem"></td><td class="sem"></td>';
        }).join('')}
        <td>${feitas.length ? totalReps(feitas) : '—'}</td>
        <td>${feitas.length && cargaUtilizada(feitas) != null ? String(cargaUtilizada(feitas)).replace('.', ',') : '—'}</td>
        <td><b>${feitas.length ? Math.round(tonelagem(feitas)).toLocaleString('pt-BR') : '—'}</b></td>
      </tr>`;
    };

    const daSessao = treinos.filter((t) => t.sessao_id === sessao.id);
    const nBlocos = Math.max(n, ...daSessao.map((t) => t.microciclo));
    return Array.from({ length: nBlocos }, (_, i) => i + 1).map((m) => {
      const treino = daSessao.filter((t) => t.microciclo === m).at(-1);
      const total = treino ? tonelagem(treino.series) : null;
      return `
      <section class="card bloco">
        <h2>Treino ${esc(sessao.codigo)} · ${esc(sessao.nome)} – Micro ${m}
          <small class="sub">${treino ? `${treino.data.split('-').reverse().join('/')}${treino.status === 'em_andamento' ? ' · em andamento' : ''} · ${Math.round(total).toLocaleString('pt-BR')} kg` : `semana ${semanaDaEscada(m, n)} da escada · não executado`}</small></h2>
        <div class="tabela-rolavel"><table class="tabela planilha num">
          ${cab}
          <tbody>${sessao.itens.map((item, k) => linha(item, k, m, treino)).join('')}</tbody>
        </table></div>
        <p class="dica">Observações sobre o treino: ${treino?.observacao ? esc(treino.observacao) : '—'}</p>
      </section>`;
    }).join('');
  }

  // Aba Progressão: cada treino × micro contra o micro anterior e o Micro 1, e o quadro "Análise do microciclo"
  function progressao() {
    const n = (v) => (v == null ? '—' : String(v).replace('.', ','));
    const kg = (v) => `${Math.round(v).toLocaleString('pt-BR')}`;
    const contagem = (f) => (f.comparados ? `${f.progrediram} progrediram · ${f.mantiveram} mantiveram · ${f.regrediram} regrediram` : '');
    const geral = `
      <section class="card">
        <h2>Análise por microciclo</h2>
        <p class="sub">Todos os treinos juntos. É o que decide a sugestão de deload.</p>
        ${prog.deload.sugerir ? `<div class="analise"><div class="analise-topo">${icone('alerta')}<b>Sugestão de deload</b></div>
          <p>${esc(prog.deload.motivo)} ${esc(prog.deload.como)}</p></div>` : ''}
        <div class="tabela-rolavel"><table class="tabela num">
          <thead><tr><th>Micro</th><th>Treinos</th><th>Tonelagem</th><th title="Tonelagem por série, sem BO">Variação</th><th>Fadiga</th><th class="esq">Mensagem</th></tr></thead>
          <tbody>${prog.micros.map((m) => `<tr>
            <td>${m.microciclo}</td><td>${m.treinos_feitos}</td><td>${m.treinos_feitos ? kg(m.tonelagem) : '—'}</td>
            <td>${varPct(m.var_comparavel)}</td><td>${chipFadiga(m.fadiga) || '—'}</td><td class="esq">${esc(m.fadiga.mensagem)}</td>
          </tr>`).join('')}</tbody>
        </table></div>
        ${prog.checkin ? `<p class="dica">Último check-in (${esc(prog.checkin.semana_iso)}): média ${n(prog.checkin.media)} de 5.</p>` : '<p class="dica">Nenhum check-in semanal ainda.</p>'}
      </section>`;

    const sessao = prog.sessoes.find((s) => s.id === abaProg) || prog.sessoes[0];
    if (!sessao) return geral;
    const escolha = `<div class="segmentos rolar">${prog.sessoes.map((s) => `<button data-prog="${s.id}" aria-selected="${s.id === sessao.id}">Treino ${esc(s.codigo)}</button>`).join('')}</div>`;
    const micros = sessao.micros.map((b) => {
      if (!b.executado) {
        return `<section class="card bloco"><h2>Treino ${esc(sessao.codigo)} – Micro ${b.microciclo}<small class="sub">NÃO EXECUTADO</small></h2></section>`;
      }
      return `
      <section class="card bloco">
        <h2>Treino ${esc(sessao.codigo)} · ${esc(sessao.nome)} – Micro ${b.microciclo}
          <small class="sub">${b.data.split('-').reverse().join('/')} · ${kg(b.tonelagem)} kg${b.micro_anterior ? ` · comparado com o Micro ${b.micro_anterior}` : ''}</small></h2>
        <div class="tabela-rolavel"><table class="tabela planilha num">
          <thead>
            <tr><th rowspan="2" class="fixa">Nº</th><th rowspan="2" class="fixa fixa-2">Exercício</th>
              <th colspan="3">Tonelagem</th><th colspan="3">Reps</th><th colspan="3">Carga</th><th rowspan="2">Status</th></tr>
            <tr><th>kg</th><th>vs ant.</th><th>vs M1</th><th>total</th><th>vs ant.</th><th title="Reps abaixo do mínimo / acima do máximo">desvio</th><th>kg</th><th>vs ant.</th><th>vs M1</th></tr>
          </thead>
          <tbody>${b.exercicios.map((e, k) => `<tr>
            <td class="fixa">${k + 1}</td><td class="fixa fixa-2 nome">${esc(e.nome)}</td>
            ${e.series ? `
              <td>${kg(e.tonelagem)}</td><td>${varPct(e.vs_anterior?.tonelagem)}</td><td>${varPct(e.vs_micro1?.tonelagem)}</td>
              <td>${e.reps}</td><td>${varPct(e.vs_anterior?.reps)}</td>
              <td>${e.desvio.abaixo ? `<span class="var caiu">−${e.desvio.abaixo}</span>` : ''}${e.desvio.acima ? ` <span class="var subiu">+${e.desvio.acima}</span>` : ''}${e.desvio.abaixo || e.desvio.acima ? '' : '0'}</td>
              <td>${n(e.carga)}</td><td>${varPct(e.vs_anterior?.carga)}</td><td>${varPct(e.vs_micro1?.carga)}</td>
              <td>${chipStatus(e.status) || '—'}</td>`
            : '<td colspan="10" class="vazia">não registrado</td>'}
          </tr>`).join('')}</tbody>
        </table></div>
        <div class="analise">
          <div class="analise-topo"><b>Análise do microciclo</b>${chipFadiga(b.fadiga)}${b.var_comparavel != null ? varPct(b.var_comparavel) : ''}</div>
          <p>${esc(b.fadiga.mensagem)}${contagem(b.fadiga) ? ` ${contagem(b.fadiga)}.` : ''}</p>
        </div>
      </section>`;
    }).join('');
    return `${geral}${escolha}${micros}`;
  }

  // Visão "volume em escada": semanas × exercícios, editável (toque na célula)
  function escada() {
    const n = dados.programa.n_microciclos;
    return `
      <section class="card">
        <h2>Volume em escada</h2>
        <p class="sub">Toque numa célula para mudar as séries daquela semana.</p>
        <div class="tabela-rolavel"><table class="tabela escada">
          <thead><tr><th class="fixa">Exercício</th>${Array.from({ length: n }, (_, i) => `<th>S${i + 1}</th>`).join('')}</tr></thead>
          <tbody>${dados.sessoes.map((s) => `
            <tr class="grupo-linha"><th colspan="${n + 1}">Treino ${esc(s.codigo)} · ${esc(s.nome)}</th></tr>
            ${s.itens.map((item) => `<tr>
              <th class="fixa nome">${esc(item.exercicio.nome)}</th>
              ${item.semanas.map((w) => `<td><button type="button" class="celula-escada ${w.n_bo ? 'com-bo' : ''}" data-celula="${item.id}:${w.microciclo}">${esc(w.descricao)}</button></td>`).join('')}
            </tr>`).join('')}`).join('')}
          </tbody>
        </table></div>
      </section>`;
  }

  desenhar();
}
