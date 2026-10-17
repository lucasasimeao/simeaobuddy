// Alunos (admin): lista por status (#/alunos) e ficha de cada um com a anamnese (#/alunos/3).
import { api } from '../api.js';
import { icone } from '../icones.js';
import { esc, avatar, aviso, ROTULO_STATUS } from '../componentes.js';

export const titulo = 'Alunos';

const ABAS = [
  { id: 'pendente', rotulo: 'Aguardando' },
  { id: 'ativo', rotulo: 'Ativos' },
  { id: 'inativo', rotulo: 'Desativados' },
];
const OBJETIVO = { emagrecimento: 'Emagrecimento', hipertrofia: 'Hipertrofia' };
const NIVEL = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' };

export function render(el, params) {
  return params[0] ? ficha(el, Number(params[0])) : lista(el);
}

function quando(dataSql) {
  if (!dataSql) return 'nunca entrou';
  const dias = Math.floor((Date.now() - Date.parse(dataSql.replace(' ', 'T') + 'Z')) / 86400000);
  return dias <= 0 ? 'entrou hoje' : dias === 1 ? 'entrou ontem' : `entrou há ${dias} dias`;
}

async function lista(el) {
  const { alunos } = await api('/alunos');
  const conta = (s) => alunos.filter((a) => a.status === s).length;
  let aba = conta('pendente') ? 'pendente' : 'ativo';

  function desenhar() {
    const daAba = alunos.filter((a) => a.status === aba);
    el.innerHTML = `
      <div class="segmentos" role="tablist">
        ${ABAS.map((a) => `<button role="tab" data-aba="${a.id}" aria-selected="${a.id === aba}">${a.rotulo}${conta(a.id) ? ` <span class="num">${conta(a.id)}</span>` : ''}</button>`).join('')}
      </div>
      ${daAba.length ? `<div class="lista">${daAba.map((a) => `
        <a class="lista-item" href="#/alunos/${a.id}">
          ${avatar(a, 40)}
          <span class="texto">${esc(a.nome)}<small>${esc([OBJETIVO[a.objetivo], a.status === 'pendente' ? a.email : quando(a.ultimo_acesso)].filter(Boolean).join(' · '))}</small></span>
          ${icone('seta')}
        </a>`).join('')}</div>`
        : `<section class="card vazio"><div class="icone-grande">${icone('alunos')}</div>
           <p>${aba === 'pendente' ? 'Ninguém aguardando. Mande o link do app para os seus amigos entrarem com o Google.' : 'Nenhum aluno aqui.'}</p></section>`}`;
    for (const b of el.querySelectorAll('[data-aba]')) b.addEventListener('click', () => { aba = b.dataset.aba; desenhar(); });
  }
  desenhar();
}

const campo = (nome, rotulo, valor, extra = '') =>
  `<label>${rotulo}<input name="${nome}" value="${esc(valor ?? '')}" ${extra}></label>`;
const opcoes = (nome, rotulo, valor, mapa) =>
  `<label>${rotulo}<select name="${nome}"><option value="">—</option>${Object.entries(mapa).map(([v, t]) => `<option value="${v}" ${v === valor ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
const areaTexto = (nome, rotulo, valor) =>
  `<label>${rotulo}<textarea name="${nome}" rows="2">${esc(valor ?? '')}</textarea></label>`;

async function ficha(el, id) {
  const { aluno, anamnese: a } = await api(`/alunos/${id}`);
  const num = 'inputmode="decimal"';
  el.innerHTML = `
    <a class="voltar" href="#/alunos">${icone('voltar')}Alunos</a>
    <section class="card">
      <div class="pessoa">
        ${avatar(aluno, 56)}
        <div><h2>${esc(aluno.nome)}</h2><p class="sub">${esc(aluno.email || '')}</p></div>
      </div>
      <span class="etiqueta"><span class="ponto ${aluno.status === 'ativo' ? 'ok' : aluno.status === 'inativo' ? 'erro' : ''}"></span>${ROTULO_STATUS[aluno.status]}</span>
      <div class="acoes">
        ${aluno.status !== 'ativo' ? `<button class="botao principal" data-status="ativo">${icone('ok')}${aluno.status === 'pendente' ? 'Aprovar' : 'Reativar'}</button>` : ''}
        ${aluno.status !== 'inativo' ? `<button class="botao" data-status="inativo">${icone('bloquear')}${aluno.status === 'pendente' ? 'Recusar' : 'Desativar'}</button>` : ''}
      </div>
    </section>

    <form class="card form" id="form">
      <h2>Anamnese</h2>
      ${campo('nome', 'Nome', aluno.nome, 'required maxlength="60"')}
      <div class="grade-2">
        ${opcoes('objetivo', 'Objetivo', a.objetivo, OBJETIVO)}
        ${opcoes('nivel', 'Nível', a.nivel, NIVEL)}
        ${opcoes('sexo', 'Sexo', a.sexo, { M: 'Masculino', F: 'Feminino', outro: 'Outro' })}
        ${campo('nascimento', 'Nascimento', a.nascimento, 'type="date"')}
        ${campo('altura_cm', 'Altura (cm)', a.altura_cm, num)}
        ${campo('peso_kg', 'Peso (kg)', a.peso_kg, num)}
        ${campo('dias_semana', 'Dias por semana', a.dias_semana, 'inputmode="numeric"')}
        ${campo('minutos_sessao', 'Minutos por treino', a.minutos_sessao, 'inputmode="numeric"')}
        ${campo('meta_peso', 'Meta de peso (kg)', a.meta_peso, num)}
      </div>
      ${campo('meta_texto', 'Meta', a.meta_texto, 'placeholder="Ex.: −6 kg até março"')}
      ${areaTexto('restricoes', 'Lesões / restrições', a.restricoes)}
      ${areaTexto('evitar', 'Exercícios a evitar', a.evitar)}
      ${areaTexto('equipamentos', 'Equipamentos disponíveis', a.equipamentos)}
      ${areaTexto('preferencias', 'Preferências', a.preferencias)}
      <p class="erro-msg" id="erro" role="alert" hidden></p>
      <button class="botao principal cheio" type="submit">Salvar</button>
    </form>`;

  for (const b of el.querySelectorAll('[data-status]')) {
    b.addEventListener('click', async () => {
      const novo = b.dataset.status;
      if (novo === 'inativo' && !confirm(`${aluno.status === 'pendente' ? 'Recusar' : 'Desativar'} ${aluno.nome}? Os dados não são apagados.`)) return;
      try {
        await api(`/alunos/${id}/status`, { metodo: 'POST', corpo: { status: novo } });
        aviso(novo === 'ativo' ? 'Aluno liberado!' : 'Aluno desativado.');
        ficha(el, id);
      } catch (e) { aviso(e.message, 'erro'); }
    });
  }

  const form = el.querySelector('#form');
  const erro = el.querySelector('#erro');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const { nome, ...anamnese } = Object.fromEntries(new FormData(form));
    erro.hidden = true;
    try {
      await api(`/alunos/${id}`, { metodo: 'PUT', corpo: { nome, anamnese } });
      aviso('Salvo!');
    } catch (e) {
      erro.textContent = e.message;
      erro.hidden = false;
    }
  });
}
