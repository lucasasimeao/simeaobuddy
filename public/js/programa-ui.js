// Partes da interface usadas pelas telas Programas e Planilha.
import { api } from './api.js';
import { esc } from './componentes.js';

export const PAPEL = { principal: 'Principal', secundario: 'Secundário', isolado: 'Isolado' };
export const ROTULO_TIPO = { warmup: 'WARM UP', feeder: 'FEEDER', ws: 'WS', top: 'TOP', bo: 'BO', muscle_round: 'MR' };

export const faixa = (item) => (item.metodo === 'muscle_round'
  ? `${item.mr_blocos}×${item.mr_reps}`
  : item.reps_min && item.reps_max ? `${item.reps_min}–${item.reps_max}` : '—');

export const segundos = (s) => (s >= 60 && s % 30 === 0 ? `${String(s / 60).replace('.', ',')} min` : `${s} s`);

export const etiqueta = (tipo, texto) => `<span class="tag tag-${tipo}">${esc(texto ?? ROTULO_TIPO[tipo])}</span>`;

// Campo de número com − e + (toque grande)
export function stepper(nome, rotulo, valor, { min = 0, max = 10, passo = 1 } = {}) {
  return `
    <div class="stepper" data-stepper="${nome}" data-min="${min}" data-max="${max}" data-passo="${passo}">
      <span class="stepper-rotulo">${rotulo}</span>
      <div class="stepper-controle">
        <button type="button" data-delta="-1" aria-label="Menos ${rotulo}">−</button>
        <output class="num" name="${nome}">${valor}</output>
        <button type="button" data-delta="1" aria-label="Mais ${rotulo}">+</button>
      </div>
    </div>`;
}

export function ligarSteppers(raiz) {
  raiz.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-delta]');
    if (!b) return;
    const st = b.closest('[data-stepper]');
    const out = st.querySelector('output');
    const passo = Number(st.dataset.passo);
    const novo = Number(out.value || out.textContent) + Number(b.dataset.delta) * passo;
    if (novo < Number(st.dataset.min) || novo > Number(st.dataset.max)) return;
    out.textContent = String(novo);
    st.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

export const lerStepper = (raiz, nome) => Number(raiz.querySelector(`[data-stepper="${nome}"] output`).textContent);

// Janela para editar uma semana da escada. Resolve com o programa atualizado (ou null se cancelar).
export function editarSemana(item, microciclo, nMicrociclos) {
  const s = item.semanas.find((w) => w.microciclo === microciclo);
  const dialogo = document.createElement('dialog');
  dialogo.className = 'dialogo';
  dialogo.innerHTML = `
    <form method="dialog" class="form">
      <h2>${esc(item.exercicio.nome)}</h2>
      <p class="sub">Semana ${microciclo} · hoje: <b>${esc(s.descricao)}</b></p>
      <div class="grade-2">
        ${stepper('n_ws', 'WS', s.n_ws, { max: 6 })}
        ${stepper('n_top', 'TOP', s.n_top, { max: 2 })}
        ${stepper('n_bo', 'Back-off', s.n_bo, { max: 3 })}
        ${stepper('n_mr', 'Muscle Round', s.n_mr, { max: 3 })}
        ${stepper('rir_ws', 'RIR das WS', s.rir_ws, { max: 5 })}
        ${stepper('rir_top', 'RIR do TOP', s.rir_top, { max: 5 })}
        ${stepper('pct_bo', '% a menos no BO', s.pct_bo, { min: 5, max: 50, passo: 5 })}
      </div>
      ${nMicrociclos > 1 ? '<label class="check"><input type="checkbox" name="todas">Aplicar em todas as semanas</label>' : ''}
      <p class="erro-msg" role="alert" hidden></p>
      <div class="acoes">
        <button class="botao" value="cancelar" type="submit">Cancelar</button>
        <button class="botao principal" value="salvar" type="submit">Salvar</button>
      </div>
    </form>`;
  document.body.append(dialogo);
  ligarSteppers(dialogo);
  dialogo.showModal();

  return new Promise((resolver) => {
    const form = dialogo.querySelector('form');
    const erro = dialogo.querySelector('.erro-msg');
    form.addEventListener('submit', async (ev) => {
      if (ev.submitter?.value !== 'salvar') return;
      ev.preventDefault();
      const valores = Object.fromEntries(['n_ws', 'n_top', 'n_bo', 'n_mr', 'rir_ws', 'rir_top', 'pct_bo'].map((c) => [c, lerStepper(dialogo, c)]));
      const semanas = form.todas?.checked
        ? item.semanas.map((w) => ({ ...valores, microciclo: w.microciclo }))
        : [{ ...valores, microciclo }];
      try {
        const programa = await api(`/programas/itens/${item.id}/semanas`, { metodo: 'PUT', corpo: { semanas } });
        dialogo.close();
        resolver(programa);
      } catch (e) {
        erro.textContent = e.message;
        erro.hidden = false;
      }
    });
    dialogo.addEventListener('close', () => {
      dialogo.remove();
      resolver(null);
    });
  });
}

// Busca de exercício da biblioteca com sugestões. aoEscolher(exercicio)
export function seletorExercicio(caixa, aoEscolher, { placeholder = 'Buscar exercício…', ignorar = () => false } = {}) {
  caixa.innerHTML = `
    <div class="seletor">
      <input type="search" placeholder="${esc(placeholder)}" autocomplete="off" enterkeyhint="search">
      <div class="sugestoes"></div>
    </div>`;
  const input = caixa.querySelector('input');
  const sugestoes = caixa.querySelector('.sugestoes');
  let espera;
  let lista = [];
  input.addEventListener('input', () => {
    clearTimeout(espera);
    const termo = input.value.trim();
    if (termo.length < 2) { sugestoes.innerHTML = ''; return; }
    espera = setTimeout(async () => {
      lista = (await api(`/exercicios?busca=${encodeURIComponent(termo)}`)).exercicios.filter((e) => !ignorar(e)).slice(0, 8);
      sugestoes.innerHTML = lista.map((e) => `<button type="button" data-id="${e.id}">${esc(e.nome)}</button>`).join('')
        || '<p class="dica">Nada encontrado.</p>';
    }, 200);
  });
  sugestoes.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-id]');
    if (!b) return;
    const e = lista.find((x) => x.id === Number(b.dataset.id));
    input.value = '';
    sugestoes.innerHTML = '';
    aoEscolher(e);
  });
  return input;
}
