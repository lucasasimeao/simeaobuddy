// Ficha na academia (#/treino/12) e resumo (#/treino/12/resumo). Feita para usar com uma mão.
// As contas (feeders, back-off, tonelagem) vêm de src/treino/, servido em /js/treino/.
import { api } from '../api.js';
import { icone } from '../icones.js';
import { esc, aviso } from '../componentes.js';
import { etiqueta, faixa, segundos, seletorExercicio, chipStatus, varPct } from '../programa-ui.js';
import { iniciarTimer, vibrar, parar } from '../timer.js';
import { calcularFeeders } from '/js/treino/feeders.js';
import { cargaBackoff } from '/js/treino/tonelagem.js';

export const titulo = 'Treino';

export function render(el, params) {
  const id = Number(params[0]);
  return params[1] === 'resumo' ? resumo(el, id) : ficha(el, id);
}

const num = (v) => (v === null || v === undefined || v === '' ? '' : String(v).replace('.', ','));
const lerNum = (v) => {
  const n = Number(String(v ?? '').replace(',', '.').trim());
  return String(v ?? '').trim() === '' || !Number.isFinite(n) ? null : n;
};
const novoUuid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

// ---------------- Ficha ----------------
async function ficha(tela, id) {
  let dados = await api(`/treinos/${id}`);
  // Contêiner próprio: os eventos morrem junto com a tela (o #tela é reaproveitado entre as rotas)
  const raiz = document.createElement('div');
  raiz.className = 'ficha';
  tela.append(raiz);
  const estados = new Map(); // item_id → { linhas: Map("posicao:bloco" → linha), boManual, feitos:Set }

  function estadoDe(item) {
    if (estados.has(item.id) && estados.get(item.id).exercicio === item.exercicio.id) return estados.get(item.id);
    const linhas = new Map();
    const planejadas = item.semana?.series || [];
    const ant = item.anterior?.series || [];
    const reg = (p, b) => item.registradas.find((s) => s.posicao === p && s.bloco === b);
    const antDe = (p, b, tipo) => ant.find((s) => s.posicao === p && s.bloco === b)
      || ant.filter((s) => s.tipo === tipo).at(-1) || null;
    planejadas.forEach((serie, p) => {
      const blocos = item.metodo === 'muscle_round' ? Array.from({ length: item.mr_blocos || 4 }, (_, k) => k + 1) : [0];
      for (const b of blocos) {
        const r = reg(p, b);
        const a = antDe(p, b, serie.tipo);
        linhas.set(`${p}:${b}`, {
          posicao: p, bloco: b, tipo: serie.tipo, rir: serie.rir, pct: serie.pct,
          kg: r?.carga ?? a?.carga ?? null, reps: r?.reps ?? null, anterior: a,
          salvo: r ? { kg: r.carga, reps: r.reps } : null, uuid: r?.uuid || null,
        });
      }
    });
    const e = { exercicio: item.exercicio.id, linhas, boManual: false, feitos: new Set() };
    estados.set(item.id, e);
    atualizarBackoff(item, e);
    return e;
  }

  // Carga de referência para as feeders: a 1ª série válida (WS ou TOP)
  const cargaRef = (e) => [...e.linhas.values()].find((l) => l.tipo === 'ws' || l.tipo === 'top' || l.tipo === 'muscle_round')?.kg;
  const cargaTop = (e) => [...e.linhas.values()].find((l) => l.tipo === 'top')?.kg;

  // BO ainda não salvo e não mexido à mão: acompanha o top (−20%)
  function atualizarBackoff(item, e) {
    if (e.boManual) return;
    for (const l of e.linhas.values()) {
      if (l.tipo !== 'bo' || l.salvo) continue;
      const kg = cargaBackoff(cargaTop(e), l.pct, item.exercicio.incremento_kg);
      if (kg !== null) l.kg = kg;
    }
  }

  const textoAnterior = (l) => (l.anterior ? `ant. ${num(l.anterior.carga)} × ${l.anterior.reps}` : 'sem histórico');
  const mudou = (l) => !l.salvo || l.salvo.kg !== lerNum(l.kg) || l.salvo.reps !== lerNum(l.reps);

  function campo(nome, valor, rotulo, modo, placeholder = '') {
    return `<div class="campo-num">
      <button type="button" data-ajuste="${nome}" data-d="-1" aria-label="Menos ${rotulo}">−</button>
      <label><input data-campo="${nome}" inputmode="${modo}" value="${esc(num(valor))}" placeholder="${esc(placeholder)}" aria-label="${rotulo}"><small>${rotulo}</small></label>
      <button type="button" data-ajuste="${nome}" data-d="1" aria-label="Mais ${rotulo}">+</button>
    </div>`;
  }

  function linhaSerie(item, l) {
    const meta = l.tipo === 'bo' ? `−${l.pct}% · RIR 0–1` : l.tipo === 'muscle_round' ? `Bloco ${l.bloco} · ${item.mr_reps} reps` : `RIR ${l.rir}`;
    const salva = l.salvo && !mudou(l);
    return `
      <div class="serie ${salva ? 'feita' : ''}" data-linha="${l.posicao}:${l.bloco}">
        <div class="serie-topo">
          ${etiqueta(l.tipo, l.tipo === 'muscle_round' ? `BLOCO ${l.bloco}` : undefined)}
          <span class="meta">${meta}</span>
          <span class="ant num">${esc(textoAnterior(l))}</span>
          <button type="button" class="ok-serie ${salva ? 'feita' : ''}" data-salvar aria-label="${salva ? 'Série salva (toque para apagar)' : 'Salvar série'}">${icone('ok')}</button>
        </div>
        <div class="serie-campos">
          ${l.tipo === 'muscle_round' ? '' : campo('kg', l.kg, 'kg', 'decimal')}
          ${campo('reps', l.reps, 'reps', 'numeric', l.anterior?.reps ?? '')}
        </div>
      </div>`;
  }

  function cartao(item, k) {
    const e = estadoDe(item);
    const ref = cargaRef(e);
    const feeders = calcularFeeders(item.feeders, ref, item.exercicio.incremento_kg);
    const mr = item.metodo === 'muscle_round';
    const linhas = [...e.linhas.values()];
    const feitas = linhas.filter((l) => l.salvo).length;
    const dicas = [item.exercicio.observacoes, item.observacoes].filter(Boolean);
    return `
      <article class="card exercicio-card ${feitas && feitas >= linhas.length ? 'completo' : ''}" data-item="${item.id}">
        <div class="ex-topo">
          <span class="item-num num">${k + 1}</span>
          <div class="item-nome">
            <h3>${esc(item.exercicio.nome)}</h3>
            ${item.exercicio_original ? `<p class="sub">no lugar de ${esc(item.exercicio_original.nome)}</p>` : ''}
          </div>
          ${item.exercicio.video_url ? `<a class="botao-icone" href="${esc(item.exercicio.video_url)}" target="_blank" rel="noopener" aria-label="Ver vídeo">${icone('play')}</a>` : ''}
          <button type="button" class="botao-icone" data-trocar aria-label="Trocar exercício">${icone('trocar')}</button>
        </div>
        <div class="chips-info num">
          <span>${mr ? `${item.mr_blocos}×${item.mr_reps} · ${item.mr_descanso_seg} s entre blocos` : `${faixa(item)} reps`}</span>
          <span>${esc(item.cadencia)}</span>
          <span>${icone('relogio')}${segundos(item.descanso_seg)}</span>
          <span class="progresso-ex">${feitas}/${linhas.length}</span>
        </div>
        ${item.sugestao ? `<p class="sugestao">${icone('subir')}<span><b>Hoje:</b> ${esc(item.sugestao.texto)}</span></p>` : ''}
        ${dicas.length ? `<details class="dicas"><summary>Dicas e substitutos</summary><p>${dicas.map(esc).join('<br>')}</p>
          ${item.substitutos.length ? `<p class="sub">Na falta do aparelho: ${item.substitutos.map((s) => esc(s.nome)).join(', ')}</p>` : ''}</details>` : ''}

        ${item.tem_warmup ? `
          <div class="serie leve ${e.feitos.has('wu') ? 'feita' : ''}">
            <div class="serie-topo">${etiqueta('warmup')}<span class="meta">15–20 reps, bem leve</span>
              <button type="button" class="ok-serie ${e.feitos.has('wu') ? 'feita' : ''}" data-feito="wu" aria-label="Warm up feito">${icone('ok')}</button></div>
          </div>` : ''}
        ${feeders.map((f, i) => `
          <div class="serie leve ${e.feitos.has(`f${i}`) ? 'feita' : ''}">
            <div class="serie-topo">${etiqueta('feeder')}
              <span class="meta num"><b class="kg-feeder" data-feeder="${i}">${f.kg != null ? `${num(f.kg)} kg` : `${f.pct}%`}</b> × ${esc(f.reps)} · RIR ≥5</span>
              <button type="button" class="ok-serie ${e.feitos.has(`f${i}`) ? 'feita' : ''}" data-feito="f${i}" data-descanso="${f.descanso}" aria-label="Feeder feita">${icone('ok')}</button></div>
          </div>`).join('')}

        ${mr ? `<div class="serie mr-carga"><div class="serie-topo">${etiqueta('muscle_round', 'MUSCLE ROUND')}<span class="meta">mesma carga nos ${item.mr_blocos} blocos</span></div>
          <div class="serie-campos">${campo('mrkg', linhas[0]?.kg, 'kg', 'decimal')}</div></div>` : ''}
        ${linhas.map((l) => linhaSerie(item, l)).join('') || '<p class="dica">Sem séries nesta semana.</p>'}

        ${item.anterior ? `<button type="button" class="botao cheio leve-botao" data-repetir>${icone('atualizar')}Repetir o anterior (${item.anterior.data.split('-').reverse().slice(0, 2).join('/')})</button>` : ''}
      </article>`;
  }

  function desenhar() {
    const { treino, sessao, programa } = dados;
    const finalizado = treino.status === 'finalizado';
    raiz.innerHTML = `
      <div class="cabecalho-treino">
        <div><h2>Treino ${esc(sessao.codigo)} · ${esc(sessao.nome)}</h2>
          <p class="sub num">Semana ${treino.semana_escada} de ${programa.n_microciclos} · Micro ${treino.microciclo}</p></div>
        <span class="etiqueta num" id="relogio">${icone('relogio')}<span></span></span>
      </div>
      ${finalizado ? `<section class="card aviso-card"><p>Treino finalizado. Você ainda pode corrigir alguma série.</p>
        <a class="botao" href="#/treino/${treino.id}/resumo">Ver resumo</a></section>` : ''}
      ${dados.itens.map(cartao).join('')}
      <section class="card form">
        <label>Observações do treino<textarea id="obs" rows="3" placeholder="Como foi? Sono, dor, energia…">${esc(treino.observacao || '')}</textarea></label>
        <button class="botao principal cheio" id="finalizar">${icone('ok')}${finalizado ? 'Salvar e ver resumo' : 'Finalizar treino'}</button>
        ${finalizado ? '' : '<button class="botao cheio" id="descartar">Descartar este treino</button>'}
      </section>`;
    atualizarRelogio();
  }

  function redesenharItem(item) {
    const k = dados.itens.indexOf(item);
    const velho = raiz.querySelector(`[data-item="${item.id}"]`);
    const tmp = document.createElement('div');
    tmp.innerHTML = cartao(item, k);
    velho.replaceWith(tmp.firstElementChild);
  }

  // Atualiza só os textos que dependem da carga (sem redesenhar, para não perder o foco do campo)
  function atualizarDerivados(item, card) {
    const e = estadoDe(item);
    atualizarBackoff(item, e);
    const feeders = calcularFeeders(item.feeders, cargaRef(e), item.exercicio.incremento_kg);
    feeders.forEach((f, i) => {
      const alvo = card.querySelector(`[data-feeder="${i}"]`);
      if (alvo) alvo.textContent = f.kg != null ? `${num(f.kg)} kg` : `${f.pct}%`;
    });
    for (const l of e.linhas.values()) {
      const linha = card.querySelector(`[data-linha="${l.posicao}:${l.bloco}"]`);
      if (!linha) continue;
      if (l.tipo === 'bo' && !l.salvo && document.activeElement?.closest('[data-linha]') !== linha) {
        const input = linha.querySelector('[data-campo="kg"]');
        if (input) input.value = num(l.kg);
      }
      const salva = l.salvo && !mudou(l);
      linha.classList.toggle('feita', Boolean(salva));
      linha.querySelector('[data-salvar]').classList.toggle('feita', Boolean(salva));
    }
  }

  let relogioIntervalo;
  function atualizarRelogio() {
    const alvo = raiz.querySelector('#relogio span');
    const inicio = Date.parse(dados.treino.inicio.replace(' ', 'T') + 'Z');
    const fim = dados.treino.fim ? Date.parse(dados.treino.fim.replace(' ', 'T') + 'Z') : null;
    const mostrar = () => { if (alvo.isConnected) alvo.textContent = `${Math.max(0, Math.floor(((fim || Date.now()) - inicio) / 60000))} min`; };
    mostrar();
    clearInterval(relogioIntervalo);
    if (!fim) relogioIntervalo = setInterval(() => { if (!alvo.isConnected) clearInterval(relogioIntervalo); else mostrar(); }, 30000);
  }

  async function salvarLinha(item, l, card) {
    const corpo = { item_id: item.id, posicao: l.posicao, bloco: l.bloco, carga: l.kg, reps: l.reps, uuid: l.uuid || (l.uuid = novoUuid()) };
    if (lerNum(l.kg) === null || lerNum(l.reps) === null) {
      aviso(item.metodo === 'muscle_round' && lerNum(l.kg) === null ? 'Coloque a carga do Muscle Round.' : 'Preencha kg e reps.', 'erro');
      return;
    }
    try {
      const { serie } = await api(`/treinos/${id}/series`, { metodo: 'PUT', corpo });
      l.salvo = { kg: serie.carga, reps: serie.reps };
      l.kg = serie.carga;
      l.reps = serie.reps;
      item.registradas = item.registradas.filter((s) => !(s.posicao === l.posicao && s.bloco === l.bloco)).concat(serie);
      vibrar(40);
      const mr = item.metodo === 'muscle_round';
      const ultimoBloco = mr && l.bloco >= (item.mr_blocos || 4);
      if (mr && !ultimoBloco) iniciarTimer(item.mr_descanso_seg || 10, `Próximo bloco · ${item.exercicio.nome}`);
      else iniciarTimer(item.descanso_seg, `Descanso · ${item.exercicio.nome}`);
      redesenharItem(item);
    } catch (e) { aviso(e.message, 'erro'); }
    void card;
  }

  async function apagarLinha(item, l) {
    if (!confirm('Apagar esta série?')) return;
    try {
      await api(`/treinos/${id}/series?item_id=${item.id}&posicao=${l.posicao}&bloco=${l.bloco}`, { metodo: 'DELETE' });
      l.salvo = null;
      item.registradas = item.registradas.filter((s) => !(s.posicao === l.posicao && s.bloco === l.bloco));
      redesenharItem(item);
    } catch (e) { aviso(e.message, 'erro'); }
  }

  function trocar(item) {
    const dialogo = document.createElement('dialog');
    dialogo.className = 'dialogo';
    dialogo.innerHTML = `
      <div class="form">
        <h2>Trocar ${esc(item.exercicio.nome)}</h2>
        ${item.registradas.length ? '<p class="erro-msg">Já tem série registrada. Apague as séries antes de trocar.</p>' : ''}
        <div class="lista">${item.substitutos.map((s) => `<button type="button" class="lista-item" data-por="${s.id}">
          <span class="texto">${esc(s.nome)}${item.exercicio_original?.id === s.id ? '<small>voltar ao original</small>' : ''}</span>${icone('seta')}</button>`).join('')
          || '<p class="dica">Nenhum substituto cadastrado.</p>'}</div>
        <span class="dica">Ou busque outro da biblioteca</span>
        <div data-busca></div>
        <button type="button" class="botao" data-fechar>Fechar</button>
      </div>`;
    document.body.append(dialogo);
    dialogo.showModal();
    const escolher = async (exercicioId) => {
      try {
        dados = await api(`/treinos/${id}/trocar`, { metodo: 'POST', corpo: { item_id: item.id, exercicio_id: exercicioId } });
        dialogo.close();
        desenhar();
      } catch (e) { aviso(e.message, 'erro'); }
    };
    dialogo.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-por]');
      if (b) escolher(Number(b.dataset.por));
      if (ev.target.closest('[data-fechar]')) dialogo.close();
    });
    seletorExercicio(dialogo.querySelector('[data-busca]'), (ex) => escolher(ex.id), { ignorar: (x) => x.id === item.exercicio.id });
    dialogo.addEventListener('close', () => dialogo.remove());
  }

  // --- eventos (delegados) ---
  raiz.addEventListener('input', (ev) => {
    const input = ev.target.closest('[data-campo]');
    if (!input) return;
    const card = input.closest('[data-item]');
    const item = dados.itens.find((i) => i.id === Number(card.dataset.item));
    const e = estadoDe(item);
    if (input.dataset.campo === 'mrkg') {
      for (const l of e.linhas.values()) l.kg = input.value;
    } else {
      const l = e.linhas.get(input.closest('[data-linha]').dataset.linha);
      l[input.dataset.campo] = input.value;
      if (l.tipo === 'bo' && input.dataset.campo === 'kg') e.boManual = true;
    }
    atualizarDerivados(item, card);
  });

  raiz.addEventListener('click', (ev) => {
    const card = ev.target.closest('[data-item]');
    if (ev.target.closest('#finalizar')) return finalizar();
    if (ev.target.closest('#descartar')) return descartar();
    if (!card) return;
    const item = dados.itens.find((i) => i.id === Number(card.dataset.item));
    const e = estadoDe(item);

    const ajuste = ev.target.closest('[data-ajuste]');
    if (ajuste) {
      const caixa = ajuste.closest('.campo-num');
      const input = caixa.querySelector('input');
      const passo = ajuste.dataset.ajuste === 'reps' ? 1 : item.exercicio.incremento_kg;
      const base = lerNum(input.value) ?? lerNum(input.placeholder) ?? 0;
      const novo = Math.max(0, Math.round((base + Number(ajuste.dataset.d) * passo) * 100) / 100);
      input.value = num(novo);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    const salvar = ev.target.closest('[data-salvar]');
    if (salvar) {
      const l = e.linhas.get(salvar.closest('[data-linha]').dataset.linha);
      if (l.salvo && !mudou(l)) apagarLinha(item, l);
      else salvarLinha(item, l, card);
      return;
    }
    const feito = ev.target.closest('[data-feito]');
    if (feito) {
      const chave = feito.dataset.feito;
      if (e.feitos.has(chave)) e.feitos.delete(chave);
      else {
        e.feitos.add(chave);
        vibrar(30);
        if (feito.dataset.descanso) iniciarTimer(Number(feito.dataset.descanso), `Feeder · ${item.exercicio.nome}`);
      }
      redesenharItem(item);
      return;
    }
    if (ev.target.closest('[data-repetir]')) {
      for (const l of e.linhas.values()) {
        if (l.salvo || !l.anterior) continue;
        l.kg = l.anterior.carga;
        l.reps = l.anterior.reps;
      }
      e.boManual = true;
      redesenharItem(item);
      return;
    }
    if (ev.target.closest('[data-trocar]')) trocar(item);
  });

  async function finalizar() {
    const faltando = dados.itens.reduce((t, item) => t + [...estadoDe(item).linhas.values()].filter((l) => !l.salvo).length, 0);
    const naoSalvas = dados.itens.some((item) => [...estadoDe(item).linhas.values()].some((l) => l.salvo && mudou(l)));
    if (naoSalvas && !confirm('Tem série alterada que você não salvou (✓). Finalizar mesmo assim?')) return;
    if (faltando && dados.treino.status !== 'finalizado'
      && !confirm(`Ainda ${faltando === 1 ? 'falta 1 série' : `faltam ${faltando} séries`} sem registro. Finalizar assim mesmo?`)) return;
    try {
      await api(`/treinos/${id}/finalizar`, { metodo: 'POST', corpo: { observacao: raiz.querySelector('#obs').value } });
      parar();
      location.hash = `#/treino/${id}/resumo`;
    } catch (e) { aviso(e.message, 'erro'); }
  }

  async function descartar() {
    if (!confirm('Descartar este treino? Ele não vai contar na sequência nem na evolução.')) return;
    try {
      await api(`/treinos/${id}/descartar`, { metodo: 'POST' });
      parar();
      location.hash = '#/hoje';
    } catch (e) { aviso(e.message, 'erro'); }
  }

  desenhar();
}

// ---------------- Resumo ----------------
async function resumo(el, id) {
  const { treino, sessao, resumo: r } = await api(`/treinos/${id}/resumo`);
  const kg = (n) => `${Math.round(n).toLocaleString('pt-BR')} kg`;
  const seta = (v) => varPct(v, 'primeira vez');
  const contagem = (st) => r.exercicios.filter((e) => e.status === st).length;
  el.innerHTML = `
    <section class="card resumo-topo">
      <p class="sobre">Treino ${esc(sessao.codigo)} · ${esc(sessao.nome)} · Micro ${treino.microciclo}</p>
      <p class="numero-grande num">${kg(r.tonelagem)}</p>
      <p class="sub">tonelagem do treino ${seta(r.variacao)}</p>
      <div class="resumo-linha num"><span>${icone('relogio')}${r.duracao_min} min</span>
        ${r.faltando ? `<span class="aviso-texto">${r.faltando} ${r.faltando === 1 ? 'série ficou' : 'séries ficaram'} sem registro</span>` : '<span>Todas as séries registradas</span>'}</div>
      ${r.exercicios.some((e) => e.status) ? `<div class="resumo-linha num">
        <span>🟢 ${contagem('progrediu')}</span><span>🟡 ${contagem('manteve')}</span><span>🔴 ${contagem('regrediu')}</span>
        ${r.prs ? `<span class="pr">${icone('trofeu')}${r.prs} ${r.prs === 1 ? 'recorde' : 'recordes'}</span>` : ''}</div>` : ''}
    </section>
    <section class="card">
      <h2>Por exercício</h2>
      <div class="lista">${r.exercicios.map((e) => `
        <div class="lista-item resumo-ex">
          <span class="texto">${esc(e.nome)}<small class="num">${e.registradas ? `${kg(e.tonelagem)} · ${e.reps} reps${e.carga != null ? ` · top ${num(e.carga)} kg` : ''}` : 'não registrado'}</small></span>
          ${e.registradas ? `<span class="estado">${chipStatus(e.status) || seta(e.variacao)}
            ${e.status ? seta(e.variacao) : ''}${e.pr ? `<span class="pr">${icone('trofeu')}PR · e1RM ${num(e.e1rm)} kg</span>` : ''}</span>` : ''}
        </div>`).join('')}</div>
      <p class="dica">Comparação com a última vez que você fez cada exercício. PR = melhor e1RM (kg × (1 + (reps + RIR) / 30)) que você já fez nele.</p>
    </section>
    ${treino.observacao ? `<section class="card"><h2>Observações</h2><p>${esc(treino.observacao)}</p></section>` : ''}
    <a class="botao principal cheio" href="#/hoje">Voltar para Hoje</a>
    <a class="botao cheio" href="#/treino/${id}">Corrigir alguma série</a>`;
}
