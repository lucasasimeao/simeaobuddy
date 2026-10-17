// Biblioteca (admin): #/biblioteca (busca + filtro), #/biblioteca/12 (editar), #/biblioteca/novo.
import { api } from '../api.js';
import { icone } from '../icones.js';
import { esc, aviso } from '../componentes.js';

export const titulo = 'Biblioteca';
export const larga = true;

let opcoesCache = null;
const opcoes = async () => (opcoesCache ??= await api('/exercicios/opcoes'));

// Filtros lembrados enquanto o app está aberto (voltar da edição mantém a busca)
const filtro = { busca: '', grupo: '', inativos: false };

export async function render(el, params) {
  const { grupos, equipamentos } = await opcoes();
  if (params[0] === 'novo') return editar(el, null, grupos, equipamentos);
  if (params[0]) return editar(el, Number(params[0]), grupos, equipamentos);
  return lista(el, grupos, equipamentos);
}

function linhaSub(e, grupos, equipamentos) {
  return [grupos[e.grupo_primario]?.rotulo, equipamentos[e.equipamento]?.rotulo, e.tipo === 'multi' ? 'Multiarticular' : 'Isolado']
    .filter(Boolean).join(' · ');
}

async function lista(el, grupos, equipamentos) {
  el.innerHTML = `
    <div class="barra-busca">
      <label class="campo-busca">${icone('busca')}
        <input type="search" id="busca" placeholder="Buscar exercício" value="${esc(filtro.busca)}" autocomplete="off" enterkeyhint="search">
      </label>
      <a class="botao principal" href="#/biblioteca/novo" aria-label="Novo exercício">${icone('mais')}<span class="so-desktop-inline">Novo</span></a>
    </div>
    <div class="filtros">
      <select id="grupo" aria-label="Grupo muscular">
        <option value="">Todos os grupos</option>
        ${Object.entries(grupos).map(([id, g]) => `<option value="${id}" ${id === filtro.grupo ? 'selected' : ''}>${g.rotulo}</option>`).join('')}
      </select>
      <label class="check"><input type="checkbox" id="inativos" ${filtro.inativos ? 'checked' : ''}>Desativados</label>
    </div>
    <p class="dica num" id="contagem"></p>
    <div class="lista" id="resultado"></div>`;

  const resultado = el.querySelector('#resultado');
  const contagem = el.querySelector('#contagem');
  let pedido = 0;

  async function buscar() {
    const meu = ++pedido;
    const q = new URLSearchParams({ busca: filtro.busca, grupo: filtro.grupo, inativos: filtro.inativos ? '1' : '' });
    const { exercicios } = await api(`/exercicios?${q}`);
    if (meu !== pedido) return;
    contagem.textContent = `${exercicios.length} ${exercicios.length === 1 ? 'exercício' : 'exercícios'}`;
    resultado.innerHTML = exercicios.length ? exercicios.map((e) => {
      const indireto = filtro.grupo && e.grupo_primario !== filtro.grupo;
      return `
      <div class="lista-item exercicio ${e.ativo ? '' : 'inativo'}">
        <a class="texto" href="#/biblioteca/${e.id}">${esc(e.nome)}
          <small>${esc(linhaSub(e, grupos, equipamentos))}${indireto ? ' · indireto' : ''}${e.ativo ? '' : ' · desativado'}</small>
        </a>
        ${e.video_url ? `<a class="botao-icone" href="${esc(e.video_url)}" target="_blank" rel="noopener" aria-label="Ver vídeo de ${esc(e.nome)}">${icone('play')}</a>` : ''}
      </div>`;
    }).join('') : `<section class="card vazio"><p>Nada encontrado. Tente outra palavra ou outro grupo.</p></section>`;
  }

  let espera;
  el.querySelector('#busca').addEventListener('input', (ev) => {
    filtro.busca = ev.target.value;
    clearTimeout(espera);
    espera = setTimeout(buscar, 200);
  });
  el.querySelector('#grupo').addEventListener('change', (ev) => { filtro.grupo = ev.target.value; buscar(); });
  el.querySelector('#inativos').addEventListener('change', (ev) => { filtro.inativos = ev.target.checked; buscar(); });
  await buscar();
}

const VAZIO = {
  nome: '', apelidos: '', grupo_primario: '', grupos_secundarios: [], tipo: 'multi', estavel: false,
  equipamento: 'maquina', incremento_kg: 5, video_url: '', observacoes: '', substitutos_info: [], ativo: true,
};

async function editar(el, id, grupos, equipamentos) {
  const e = id ? (await api(`/exercicios/${id}`)).exercicio : { ...VAZIO };
  const secundarios = new Map(e.grupos_secundarios.map((g) => [g.grupo, g.fracao]));
  let subs = [...e.substitutos_info];
  let incrementoMexido = Boolean(id);

  el.innerHTML = `
    <a class="voltar" href="#/biblioteca">${icone('voltar')}Biblioteca</a>
    <form class="card form" id="form">
      <h2>${id ? 'Editar exercício' : 'Novo exercício'}</h2>
      ${e.video_url ? `<a class="botao cheio" href="${esc(e.video_url)}" target="_blank" rel="noopener">${icone('play')}Ver execução</a>` : ''}
      <label>Nome<input name="nome" value="${esc(e.nome)}" required maxlength="80"></label>
      <label>Outros nomes (ajudam na busca)<input name="apelidos" value="${esc(e.apelidos || '')}" maxlength="200"></label>
      <div class="grade-2">
        <label>Grupo principal<select name="grupo_primario" required>
          <option value="">—</option>
          ${Object.entries(grupos).map(([g, info]) => `<option value="${g}" ${g === e.grupo_primario ? 'selected' : ''}>${info.rotulo}</option>`).join('')}
        </select></label>
        <label>Equipamento<select name="equipamento">
          ${Object.entries(equipamentos).map(([q, info]) => `<option value="${q}" ${q === e.equipamento ? 'selected' : ''}>${info.rotulo}</option>`).join('')}
        </select></label>
        <label>Tipo<select name="tipo">
          <option value="multi" ${e.tipo === 'multi' ? 'selected' : ''}>Multiarticular</option>
          <option value="isolado" ${e.tipo === 'isolado' ? 'selected' : ''}>Isolado</option>
        </select></label>
        <label>Incremento (kg)<input name="incremento_kg" inputmode="decimal" value="${String(e.incremento_kg).replace('.', ',')}" required></label>
      </div>
      <label class="check"><input type="checkbox" name="estavel" ${e.estavel ? 'checked' : ''}>Estável (máquina, smith, polia ou com apoio)</label>

      <fieldset class="grupo-campos">
        <legend>Grupos secundários (contam ½ série)</legend>
        <div class="chips" id="secundarios">
          ${Object.entries(grupos).map(([g, info]) => `<button type="button" class="chip" data-grupo="${g}" aria-pressed="${secundarios.has(g)}">${info.rotulo}</button>`).join('')}
        </div>
      </fieldset>

      <label>Link do vídeo<input name="video_url" type="url" inputmode="url" value="${esc(e.video_url || '')}" placeholder="https://youtu.be/..."></label>
      <label>Observações (técnica)<textarea name="observacoes" rows="3">${esc(e.observacoes || '')}</textarea></label>

      <fieldset class="grupo-campos">
        <legend>Substitutos (na falta do aparelho)</legend>
        <div class="lista" id="subs"></div>
        <div class="seletor">
          <input id="busca-sub" type="search" placeholder="Adicionar substituto…" autocomplete="off">
          <div class="sugestoes" id="sugestoes"></div>
        </div>
      </fieldset>

      <p class="erro-msg" id="erro" role="alert" hidden></p>
      <button class="botao principal cheio" type="submit">Salvar</button>
      ${id ? `<button class="botao cheio" type="button" id="ativo">${icone(e.ativo ? 'bloquear' : 'ok')}${e.ativo ? 'Desativar exercício' : 'Reativar exercício'}</button>` : ''}
    </form>`;

  const form = el.querySelector('#form');
  const erro = el.querySelector('#erro');

  // Secundários: liga/desliga (fração padrão ½; mantém a fração que já existia)
  el.querySelector('#secundarios').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-grupo]');
    if (!b) return;
    const g = b.dataset.grupo;
    if (secundarios.has(g)) secundarios.delete(g);
    else secundarios.set(g, 0.5);
    b.setAttribute('aria-pressed', secundarios.has(g));
  });

  // Trocar o equipamento sugere o incremento padrão (até o admin mexer no incremento)
  form.incremento_kg.addEventListener('input', () => { incrementoMexido = true; });
  form.equipamento.addEventListener('change', () => {
    if (!incrementoMexido) form.incremento_kg.value = String(equipamentos[form.equipamento.value].incremento).replace('.', ',');
    form.estavel.checked = ['maquina', 'smith', 'polia'].includes(form.equipamento.value);
  });

  // Substitutos
  const caixaSubs = el.querySelector('#subs');
  function desenharSubs() {
    caixaSubs.innerHTML = subs.map((s) => `
      <div class="lista-item compacto"><span class="texto">${esc(s.nome)}<small>${esc(equipamentos[s.equipamento]?.rotulo || '')}</small></span>
        <button type="button" class="botao-icone" data-tirar="${s.id}" aria-label="Tirar ${esc(s.nome)}">${icone('fechar')}</button></div>`).join('')
      || '<p class="dica">Nenhum substituto.</p>';
  }
  caixaSubs.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-tirar]');
    if (!b) return;
    subs = subs.filter((s) => s.id !== Number(b.dataset.tirar));
    desenharSubs();
  });
  desenharSubs();

  const buscaSub = el.querySelector('#busca-sub');
  const sugestoes = el.querySelector('#sugestoes');
  let esperaSub;
  buscaSub.addEventListener('input', () => {
    clearTimeout(esperaSub);
    const termo = buscaSub.value.trim();
    if (termo.length < 2) { sugestoes.innerHTML = ''; return; }
    esperaSub = setTimeout(async () => {
      const { exercicios } = await api(`/exercicios?busca=${encodeURIComponent(termo)}`);
      const livres = exercicios.filter((x) => x.id !== id && !subs.some((s) => s.id === x.id)).slice(0, 6);
      sugestoes.innerHTML = livres.map((x) => `<button type="button" data-por="${x.id}" data-nome="${esc(x.nome)}" data-eq="${x.equipamento}">${esc(x.nome)}</button>`).join('')
        || '<p class="dica">Nada encontrado.</p>';
    }, 200);
  });
  sugestoes.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-por]');
    if (!b) return;
    subs.push({ id: Number(b.dataset.por), nome: b.dataset.nome, equipamento: b.dataset.eq });
    buscaSub.value = '';
    sugestoes.innerHTML = '';
    desenharSubs();
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    erro.hidden = true;
    const d = new FormData(form);
    const corpo = {
      nome: d.get('nome'),
      apelidos: d.get('apelidos'),
      grupo_primario: d.get('grupo_primario'),
      equipamento: d.get('equipamento'),
      tipo: d.get('tipo'),
      incremento_kg: d.get('incremento_kg'),
      estavel: form.estavel.checked,
      grupos_secundarios: [...secundarios].map(([grupo, fracao]) => ({ grupo, fracao })),
      video_url: d.get('video_url'),
      observacoes: d.get('observacoes'),
      substitutos: subs.map((s) => s.id),
    };
    try {
      const r = await api(id ? `/exercicios/${id}` : '/exercicios', { metodo: id ? 'PUT' : 'POST', corpo });
      aviso('Salvo!');
      if (!id) location.hash = `#/biblioteca/${r.exercicio.id}`;
    } catch (e2) {
      erro.textContent = e2.message;
      erro.hidden = false;
    }
  });

  el.querySelector('#ativo')?.addEventListener('click', async () => {
    if (e.ativo && !confirm(`Desativar "${e.nome}"? Ele some das buscas, mas os treinos antigos continuam.`)) return;
    try {
      await api(`/exercicios/${id}/ativo`, { metodo: 'POST', corpo: { ativo: !e.ativo } });
      aviso(e.ativo ? 'Exercício desativado.' : 'Exercício reativado.');
      editar(el, id, grupos, equipamentos);
    } catch (e2) { aviso(e2.message, 'erro'); }
  });
}
