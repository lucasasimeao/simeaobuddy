// Programas (admin): #/programas (modelos + programas de cada pessoa) e #/programas/7 (montar/editar).
import { api } from '../api.js';
import { icone } from '../icones.js';
import { esc, aviso } from '../componentes.js';
import { PAPEL, faixa, segundos, etiqueta, editarSemana, seletorExercicio } from '../programa-ui.js';

export const titulo = 'Programas';
export const larga = true;

const STATUS = { ativo: 'Ativo', rascunho: 'Rascunho', arquivado: 'Arquivado' };
const GRUPO_ROTULO = {};

export async function render(el, params) {
  if (!Object.keys(GRUPO_ROTULO).length) {
    const { grupos } = await api('/exercicios/opcoes');
    for (const [id, g] of Object.entries(grupos)) GRUPO_ROTULO[id] = g.rotulo;
  }
  return params[0] ? editor(el, Number(params[0]), params[1]) : lista(el);
}

// ---------- Lista ----------
async function lista(el) {
  const [{ programas }, { pessoas }] = await Promise.all([api('/programas'), api('/programas/pessoas')]);
  const modelos = programas.filter((p) => !p.aluno_id);
  const daPessoa = programas.filter((p) => p.aluno_id);
  const opcoesPessoa = pessoas.map((p) => `<option value="${p.id}">${esc(p.papel === 'admin' ? `Eu (${p.nome})` : p.nome)}</option>`).join('');

  el.innerHTML = `
    <section class="card">
      <h2>Modelos</h2>
      ${modelos.map((m) => `
        <div class="modelo">
          <a class="texto" href="#/programas/${m.id}">${esc(m.nome)}<small>${m.n_sessoes} treinos · ${m.n_microciclos} semanas · toque para editar</small></a>
          <form class="usar" data-modelo="${m.id}">
            <select name="aluno_id" aria-label="Para quem" required><option value="">Usar para…</option>${opcoesPessoa}</select>
            <button class="botao principal" type="submit">Copiar</button>
          </form>
        </div>`).join('') || '<p class="sub">Nenhum modelo.</p>'}
    </section>

    <section class="card">
      <h2>Programas</h2>
      ${daPessoa.length ? `<div class="lista">${daPessoa.map((p) => `
        <a class="lista-item" href="#/programas/${p.id}">
          ${icone('programas')}
          <span class="texto">${esc(p.aluno_nome)}<small>${esc(p.nome)} · ${p.n_microciclos} semanas</small></span>
          <span class="etiqueta"><span class="ponto ${p.status === 'ativo' ? 'ok' : ''}"></span>${STATUS[p.status]}</span>
        </a>`).join('')}</div>` : '<p class="sub">Ninguém tem programa ainda. Use um modelo acima.</p>'}
    </section>

    <details class="card">
      <summary class="resumo-detalhe">${icone('mais')}Montar do zero</summary>
      <form class="form" id="novo">
        <label>Nome<input name="nome" required maxlength="100" placeholder="Ex.: Upper/Lower 4x"></label>
        <div class="grade-2">
          <label>Para quem<select name="aluno_id"><option value="">Novo modelo (sem pessoa)</option>${opcoesPessoa}</select></label>
          <label>Semanas do bloco<input name="n_microciclos" inputmode="numeric" value="3" required></label>
        </div>
        <p class="erro-msg" role="alert" hidden></p>
        <button class="botao principal cheio" type="submit">Criar</button>
      </form>
    </details>`;

  for (const f of el.querySelectorAll('form.usar')) {
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      try {
        const r = await api(`/programas/${f.dataset.modelo}/copiar`, { metodo: 'POST', corpo: { aluno_id: Number(f.aluno_id.value) } });
        aviso(r.programa.status === 'ativo' ? 'Programa criado e ativo!' : 'Criado como rascunho (a pessoa já tem um ativo).');
        location.hash = `#/programas/${r.programa.id}`;
      } catch (e) { aviso(e.message, 'erro'); }
    });
  }
  const novo = el.querySelector('#novo');
  novo.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const erro = novo.querySelector('.erro-msg');
    const d = Object.fromEntries(new FormData(novo));
    try {
      const r = await api('/programas', { metodo: 'POST', corpo: { ...d, aluno_id: d.aluno_id ? Number(d.aluno_id) : null } });
      location.hash = `#/programas/${r.programa.id}`;
    } catch (e) { erro.textContent = e.message; erro.hidden = false; }
  });
}

// ---------- Editor ----------
async function editor(el, id, aba) {
  let dados = await api(`/programas/${id}`);
  let abaAtual = aba || dados.sessoes[0]?.id || 'volume';
  let abertoItem = null; // item com o formulário aberto

  function desenhar() {
    const { programa, sessoes } = dados;
    if (abaAtual !== 'volume' && abaAtual !== 'novo' && !sessoes.some((s) => s.id === Number(abaAtual))) abaAtual = sessoes[0]?.id || 'volume';
    const sessao = sessoes.find((s) => s.id === Number(abaAtual));
    el.innerHTML = `
      <a class="voltar" href="#/programas">${icone('voltar')}Programas</a>
      <section class="card">
        <div class="cabecalho-programa">
          <div>
            <h2>${esc(programa.nome)}</h2>
            <p class="sub">${programa.aluno_id ? esc(programa.aluno_nome) : 'Modelo'} · ${programa.n_microciclos} semanas</p>
          </div>
          ${programa.aluno_id ? `<span class="etiqueta"><span class="ponto ${programa.status === 'ativo' ? 'ok' : ''}"></span>${STATUS[programa.status]}</span>` : ''}
        </div>
        <div class="acoes">
          ${programa.aluno_id && programa.status !== 'ativo' ? `<button class="botao principal" data-status="ativo">${icone('ok')}Ativar</button>` : ''}
          ${programa.aluno_id && programa.status === 'ativo' ? `<button class="botao" data-status="arquivado">Arquivar</button>` : ''}
          <a class="botao" href="#/planilha/${programa.id}">${icone('planilha')}Ver na planilha</a>
        </div>
        <details>
          <summary class="resumo-detalhe">Editar nome e semanas</summary>
          <form class="form" id="dados">
            <label>Nome<input name="nome" value="${esc(programa.nome)}" required maxlength="100"></label>
            <div class="grade-2">
              <label>Semanas do bloco<input name="n_microciclos" inputmode="numeric" value="${programa.n_microciclos}" required></label>
              <label>Início (semana 1)<input name="inicio" type="date" value="${esc(programa.inicio || '')}"></label>
            </div>
            <label>Descrição<textarea name="descricao" rows="2">${esc(programa.descricao || '')}</textarea></label>
            <button class="botao principal cheio" type="submit">Salvar</button>
          </form>
        </details>
      </section>

      <div class="segmentos rolar" role="tablist">
        ${sessoes.map((s) => `<button role="tab" data-aba="${s.id}" aria-selected="${s.id === Number(abaAtual)}">${esc(s.codigo)} · ${esc(s.nome)}</button>`).join('')}
        <button role="tab" data-aba="volume" aria-selected="${abaAtual === 'volume'}">Volume</button>
        <button role="tab" data-aba="novo" aria-selected="${abaAtual === 'novo'}" aria-label="Novo treino">${icone('mais')}</button>
      </div>

      <div id="conteudo-aba">${abaAtual === 'volume' ? volume() : abaAtual === 'novo' ? novoTreino() : sessao ? treino(sessao) : ''}</div>`;
    ligar(sessao);
  }

  // Um treino: cartões dos exercícios
  function treino(sessao) {
    const n = dados.programa.n_microciclos;
    return `
      <section class="card">
        <form class="linha-form" id="sessao">
          <input name="codigo" value="${esc(sessao.codigo)}" maxlength="3" aria-label="Código" class="curto">
          <input name="nome" value="${esc(sessao.nome)}" maxlength="40" aria-label="Nome do treino">
          <button class="botao" type="submit">Salvar</button>
          <button class="botao-icone perigo" type="button" id="apagar-sessao" aria-label="Apagar treino">${icone('fechar')}</button>
        </form>
      </section>
      ${sessao.itens.map((item, k) => `
        <article class="card item ${abertoItem === item.id ? 'aberto' : ''}" data-item="${item.id}">
          <div class="item-topo">
            <span class="item-num num">${k + 1}</span>
            <div class="item-nome">
              <h3>${esc(item.exercicio.nome)}</h3>
              <p class="sub">${PAPEL[item.papel]} · ${faixa(item)} reps · ${segundos(item.descanso_seg)} · ${esc(item.cadencia)}</p>
            </div>
          </div>
          <div class="tags">
            ${item.tem_warmup ? etiqueta('warmup') : ''}
            ${etiqueta('feeder', `${item.feeders_efetivas.length} FEEDER${item.feeders_efetivas.length === 1 ? '' : 'S'}`)}
            ${item.metodo === 'muscle_round' ? etiqueta('muscle_round', 'MUSCLE ROUND') : ''}
          </div>
          <div class="escada-linha" style="--colunas:${n}">
            ${item.semanas.map((w) => `<button type="button" class="celula-escada" data-semana="${w.microciclo}">
              <small>S${w.microciclo}</small><span>${esc(w.descricao)}</span></button>`).join('')}
          </div>
          <div class="acoes-item">
            <button class="botao-icone" data-mover="-1" aria-label="Subir" ${k === 0 ? 'disabled' : ''}>${icone('seta-cima')}</button>
            <button class="botao-icone" data-mover="1" aria-label="Descer" ${k === sessao.itens.length - 1 ? 'disabled' : ''}>${icone('seta-baixo')}</button>
            <button class="botao" data-abrir>${abertoItem === item.id ? 'Fechar' : 'Editar'}</button>
            <button class="botao-icone perigo" data-tirar aria-label="Tirar do treino">${icone('fechar')}</button>
          </div>
          ${abertoItem === item.id ? formItem(item) : ''}
        </article>`).join('')}
      <section class="card">
        <h3>Adicionar exercício</h3>
        <div id="adicionar"></div>
      </section>`;
  }

  function formItem(item) {
    const opt = (lista, valor) => Object.entries(lista).map(([v, t]) => `<option value="${v}" ${v === valor ? 'selected' : ''}>${t}</option>`).join('');
    const proprias = Array.isArray(item.feeders);
    const fs = item.feeders_efetivas;
    return `
      <form class="form form-item">
        <div class="grade-2">
          <label>Papel (define as feeders)<select name="papel">${opt(PAPEL, item.papel)}</select></label>
          <label>Warm-up<select name="warmup">${opt({ auto: 'Automático', sim: 'Sempre', nao: 'Nunca' }, item.warmup)}</select></label>
          <label>Reps mín.<input name="reps_min" inputmode="numeric" value="${item.reps_min ?? ''}"></label>
          <label>Reps máx.<input name="reps_max" inputmode="numeric" value="${item.reps_max ?? ''}"></label>
          <label>Descanso (s)<input name="descanso_seg" inputmode="numeric" value="${item.descanso_seg}"></label>
          <label>Cadência<input name="cadencia" value="${esc(item.cadencia)}"></label>
          <label>Método<select name="metodo">${opt({ normal: 'Normal', muscle_round: 'Muscle Round' }, item.metodo)}</select></label>
        </div>
        <div class="grade-3 so-mr" ${item.metodo === 'muscle_round' ? '' : 'hidden'}>
          <label>Blocos<input name="mr_blocos" inputmode="numeric" value="${item.mr_blocos ?? 4}"></label>
          <label>Reps/bloco<input name="mr_reps" inputmode="numeric" value="${item.mr_reps ?? 4}"></label>
          <label>Pausa (s)<input name="mr_descanso_seg" inputmode="numeric" value="${item.mr_descanso_seg ?? 10}"></label>
        </div>
        <label class="check"><input type="checkbox" name="feeders_proprias" ${proprias ? 'checked' : ''}>Feeders diferentes do padrão do papel</label>
        <div class="feeders" ${proprias ? '' : 'hidden'}>
          ${[0, 1, 2].map((k) => `<div class="grade-3">
            <label>Feeder ${k + 1}: reps<input name="f_reps_${k}" value="${esc(fs[k]?.reps ?? '')}"></label>
            <label>% da carga<input name="f_pct_${k}" inputmode="numeric" value="${fs[k]?.pct ?? ''}"></label>
            <label>Descanso (s)<input name="f_desc_${k}" inputmode="numeric" value="${fs[k]?.descanso ?? ''}"></label>
          </div>`).join('')}
        </div>
        <label>Observações<textarea name="observacoes" rows="2">${esc(item.observacoes || '')}</textarea></label>
        <div class="trocar"><span class="dica">Trocar exercício</span><div data-trocar></div></div>
        <p class="erro-msg" role="alert" hidden></p>
        <button class="botao principal cheio" type="submit">Salvar exercício</button>
      </form>`;
  }

  function volume() {
    const n = dados.programa.n_microciclos;
    if (!dados.volume.length) return '<section class="card vazio"><p>Adicione exercícios para ver o volume.</p></section>';
    return `
      <section class="card">
        <h2>Séries por músculo por semana</h2>
        <p class="sub">Série direta = 1, indireta = ½. Faixa sugerida para low volume: 4 a 10.</p>
        <div class="tabela-rolavel"><table class="tabela num">
          <thead><tr><th>Músculo</th>${Array.from({ length: n }, (_, i) => `<th>S${i + 1}</th>`).join('')}</tr></thead>
          <tbody>${dados.volume.map((v) => `<tr><th>${esc(GRUPO_ROTULO[v.grupo] || v.grupo)}</th>
            ${v.semanas.map((w) => `<td class="vol-${w.aviso}">${String(w.series).replace('.', ',')}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>
        <p class="dica"><span class="vol-abaixo">abaixo de 4</span> · <span class="vol-acima">acima de 10</span></p>
      </section>`;
  }

  function novoTreino() {
    const prox = String.fromCharCode(65 + dados.sessoes.length);
    return `
      <form class="card form" id="novo-treino">
        <h2>Novo treino</h2>
        <div class="grade-2">
          <label>Código<input name="codigo" value="${prox}" maxlength="3" required></label>
          <label>Nome<input name="nome" placeholder="Ex.: Push" maxlength="40" required></label>
        </div>
        <p class="erro-msg" role="alert" hidden></p>
        <button class="botao principal cheio" type="submit">Criar treino</button>
      </form>`;
  }

  async function agir(promessa, msg) {
    try {
      dados = await promessa;
      if (msg) aviso(msg);
      desenhar();
    } catch (e) { aviso(e.message, 'erro'); }
  }

  function ligar(sessao) {
    for (const b of el.querySelectorAll('[data-aba]')) {
      b.addEventListener('click', () => { abaAtual = b.dataset.aba; abertoItem = null; desenhar(); });
    }
    for (const b of el.querySelectorAll('[data-status]')) {
      b.addEventListener('click', () => agir(api(`/programas/${id}/status`, { metodo: 'POST', corpo: { status: b.dataset.status } }),
        b.dataset.status === 'ativo' ? 'Programa ativado!' : 'Programa arquivado.'));
    }
    el.querySelector('#dados').addEventListener('submit', (ev) => {
      ev.preventDefault();
      agir(api(`/programas/${id}`, { metodo: 'PUT', corpo: Object.fromEntries(new FormData(ev.target)) }), 'Salvo!');
    });

    const novo = el.querySelector('#novo-treino');
    novo?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      try {
        dados = await api(`/programas/${id}/sessoes`, { metodo: 'POST', corpo: Object.fromEntries(new FormData(novo)) });
        abaAtual = dados.sessoes.at(-1).id;
        desenhar();
      } catch (e) { const er = novo.querySelector('.erro-msg'); er.textContent = e.message; er.hidden = false; }
    });

    if (!sessao) return;
    el.querySelector('#sessao').addEventListener('submit', (ev) => {
      ev.preventDefault();
      agir(api(`/programas/sessoes/${sessao.id}`, { metodo: 'PUT', corpo: Object.fromEntries(new FormData(ev.target)) }), 'Salvo!');
    });
    el.querySelector('#apagar-sessao').addEventListener('click', () => {
      if (!confirm(`Apagar o treino ${sessao.codigo} · ${sessao.nome} e os exercícios dele?`)) return;
      agir(api(`/programas/sessoes/${sessao.id}`, { metodo: 'DELETE' }), 'Treino apagado.');
    });

    seletorExercicio(el.querySelector('#adicionar'), (ex) =>
      agir(api(`/programas/sessoes/${sessao.id}/itens`, { metodo: 'POST', corpo: { exercicio_id: ex.id } }), `${ex.nome} adicionado.`));

    for (const card of el.querySelectorAll('[data-item]')) {
      const item = sessao.itens.find((i) => i.id === Number(card.dataset.item));
      card.querySelector('[data-abrir]').addEventListener('click', () => { abertoItem = abertoItem === item.id ? null : item.id; desenhar(); });
      card.querySelector('[data-tirar]').addEventListener('click', () => {
        if (confirm(`Tirar ${item.exercicio.nome} deste treino?`)) agir(api(`/programas/itens/${item.id}`, { metodo: 'DELETE' }));
      });
      for (const b of card.querySelectorAll('[data-mover]')) {
        b.addEventListener('click', () => agir(api(`/programas/itens/${item.id}/mover`, { metodo: 'POST', corpo: { direcao: Number(b.dataset.mover) } })));
      }
      for (const b of card.querySelectorAll('[data-semana]')) {
        b.addEventListener('click', async () => {
          const novoDados = await editarSemana(item, Number(b.dataset.semana), dados.programa.n_microciclos);
          if (novoDados) { dados = novoDados; desenhar(); }
        });
      }
      const form = card.querySelector('.form-item');
      if (form) ligarFormItem(form, item);
    }
  }

  function ligarFormItem(form, item) {
    let exercicioId = item.exercicio_id;
    form.metodo.addEventListener('change', () => { form.querySelector('.so-mr').hidden = form.metodo.value !== 'muscle_round'; });
    form.feeders_proprias.addEventListener('change', () => { form.querySelector('.feeders').hidden = !form.feeders_proprias.checked; });
    const trocar = seletorExercicio(form.querySelector('[data-trocar]'), (ex) => {
      exercicioId = ex.id;
      trocar.placeholder = `Novo: ${ex.nome} (salve para confirmar)`;
    }, { placeholder: item.exercicio.nome, ignorar: (e) => e.id === item.exercicio_id });

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      const feeders = form.feeders_proprias.checked
        ? [0, 1, 2].filter((k) => d[`f_reps_${k}`] && d[`f_pct_${k}`]).map((k) => ({ reps: d[`f_reps_${k}`], pct: d[`f_pct_${k}`], descanso: d[`f_desc_${k}`] }))
        : null;
      const corpo = {
        exercicio_id: exercicioId, papel: d.papel, warmup: d.warmup, reps_min: d.reps_min, reps_max: d.reps_max,
        descanso_seg: d.descanso_seg, cadencia: d.cadencia, metodo: d.metodo, mr_blocos: d.mr_blocos, mr_reps: d.mr_reps,
        mr_descanso_seg: d.mr_descanso_seg, feeders, observacoes: d.observacoes,
      };
      try {
        dados = await api(`/programas/itens/${item.id}`, { metodo: 'PUT', corpo });
        abertoItem = null;
        aviso('Salvo!');
        desenhar();
      } catch (e) {
        const er = form.querySelector('.erro-msg');
        er.textContent = e.message;
        er.hidden = false;
      }
    });
  }

  desenhar();
}
