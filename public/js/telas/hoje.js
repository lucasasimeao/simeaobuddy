// Hoje: o treino do dia pela sequência (docs/03 item 3), continuar o que está aberto, ou escolher outro.
import { api, sessao, ehAdmin } from '../api.js';
import { icone } from '../icones.js';
import { esc, aviso } from '../componentes.js';
import { chipFadiga } from '../programa-ui.js';

export const titulo = 'Hoje';

function quando(data) {
  const hoje = new Date().toLocaleDateString('sv-SE');
  const ontem = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE');
  if (data === hoje) return 'Hoje';
  if (data === ontem) return 'Ontem';
  return data.split('-').reverse().join('/');
}
const kg = (n) => `${Math.round(n).toLocaleString('pt-BR')} kg`;

// Check-in semanal num diálogo: 5 notas de 1 a 5 (5 = melhor) + comentário
async function abrirCheckin(depois) {
  const { perguntas, atual } = await api('/checkins');
  const notas = Object.fromEntries(perguntas.map((p) => [p.campo, atual?.[p.campo] ?? null]));
  const dialogo = document.createElement('dialog');
  dialogo.className = 'dialogo';
  dialogo.innerHTML = `
    <form class="form" method="dialog">
      <h2>Check-in da semana</h2>
      <p class="sub">De 1 a 5, como foi a sua semana? 5 é sempre o melhor.</p>
      ${perguntas.map((p) => `
        <div class="notas" data-pergunta="${p.campo}">
          <span class="notas-rotulo">${esc(p.texto)}<small>1 = ${esc(p.baixo)} · 5 = ${esc(p.alto)}</small></span>
          <div class="notas-botoes">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-nota="${n}" aria-pressed="${notas[p.campo] === n}" aria-label="${esc(p.texto)} ${n}">${n}</button>`).join('')}</div>
        </div>`).join('')}
      <label>Comentário (opcional)<textarea name="comentario" rows="2" maxlength="500">${esc(atual?.comentario || '')}</textarea></label>
      <button type="submit" class="botao principal cheio">${icone('ok')}Salvar</button>
      <button type="button" class="botao" data-fechar>Agora não</button>
    </form>`;
  document.body.append(dialogo);
  dialogo.showModal();
  dialogo.addEventListener('close', () => dialogo.remove());
  dialogo.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-fechar]')) return dialogo.close();
    const b = ev.target.closest('[data-nota]');
    if (!b) return;
    const campo = b.closest('[data-pergunta]').dataset.pergunta;
    notas[campo] = Number(b.dataset.nota);
    for (const x of b.parentElement.children) x.setAttribute('aria-pressed', String(x === b));
  });
  dialogo.querySelector('form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const falta = perguntas.find((p) => notas[p.campo] == null);
    if (falta) return aviso(`Escolha uma nota para ${falta.texto.toLowerCase()}.`, 'erro');
    try {
      await api('/checkins', { metodo: 'PUT', corpo: { ...notas, comentario: dialogo.querySelector('[name=comentario]').value } });
      dialogo.close();
      aviso('Check-in salvo.');
      depois();
    } catch (e) { aviso(e.message, 'erro'); }
  });
}

export async function render(el) {
  const primeiroNome = sessao.usuario.nome.split(' ')[0];
  const [hoje, pendentes] = await Promise.all([
    api('/treinos/hoje'),
    ehAdmin() ? api('/alunos').then((r) => r.alunos.filter((a) => a.status === 'pendente').length) : 0,
  ]);

  let principal;
  if (hoje.em_andamento) {
    principal = `
      <section class="card destaque-card">
        <span class="etiqueta"><span class="ponto ok"></span>Treino em andamento</span>
        <h2>Você tem um treino aberto</h2>
        <a class="botao principal cheio" href="#/treino/${hoje.em_andamento.id}">${icone('play')}Continuar treino</a>
      </section>`;
  } else if (!hoje.programa) {
    principal = `
      <section class="card vazio">
        <div class="icone-grande">${icone('programas')}</div>
        <h2>Nenhum programa ativo</h2>
        <p>${ehAdmin() ? 'Copie o modelo para você em Programas.' : 'O Lucas ainda vai montar o seu programa.'}</p>
        ${ehAdmin() ? '<a class="botao principal" href="#/programas">Ir para Programas</a>' : ''}
      </section>`;
  } else if (!hoje.proximo) {
    principal = '<section class="card vazio"><p>O programa ainda não tem treinos.</p></section>';
  } else {
    const p = hoje.proximo;
    principal = `
      <section class="card destaque-card">
        <p class="sobre">Treino do dia</p>
        <h2 class="treino-do-dia">Treino ${esc(p.codigo)} · ${esc(p.nome)}</h2>
        <p class="sub num">Semana ${p.semana} de ${hoje.programa.n_microciclos} · Micro ${p.microciclo} · ${p.n_exercicios} exercícios</p>
        <button class="botao principal cheio" data-comecar="">${icone('play')}Começar treino</button>
        <details>
          <summary class="resumo-detalhe">Fazer outro treino</summary>
          <div class="lista">${hoje.sessoes.map((s) => `
            <button class="lista-item" data-comecar="${s.id}">
              <span class="texto">Treino ${esc(s.codigo)} · ${esc(s.nome)}<small>${s.n_exercicios} exercícios${s.feito ? ' · feito nesta semana' : ''}</small></span>
              ${s.feito ? icone('ok') : icone('seta')}
            </button>`).join('')}</div>
        </details>
      </section>`;
  }

  const deload = hoje.deload?.sugerir ? `
    <section class="card alerta-card">
      <h2>${icone('alerta')}Hora de pensar num deload</h2>
      <p>${esc(hoje.deload.motivo)}</p>
      <p class="sub">${esc(hoje.deload.como)}</p>
    </section>` : '';
  const fadiga = !hoje.deload?.sugerir && hoje.fadiga && ['baixa', 'moderada', 'alta'].includes(hoje.fadiga.nivel) ? `
    <div class="lista-item">
      ${icone('evolucao')}
      <span class="texto">Micro ${hoje.fadiga.microciclo}: ${esc(hoje.fadiga.mensagem)}</span>
      ${chipFadiga(hoje.fadiga)}
    </div>` : '';
  const checkin = hoje.checkin_pendente ? `
    <button class="lista-item destaque" data-checkin>
      ${icone('coracao')}
      <span class="texto">Check-in da semana<small>5 notas rápidas: sono, energia, dor, estresse e dieta</small></span>
      ${icone('seta')}
    </button>` : '';

  el.innerHTML = `
    <h2 class="saudacao">Oi, ${esc(primeiroNome)}</h2>
    ${deload}
    ${pendentes ? `
      <a class="lista-item destaque" href="#/alunos">
        ${icone('alunos')}
        <span class="texto">${pendentes === 1 ? '1 pessoa aguardando' : `${pendentes} pessoas aguardando`} aprovação<small>Toque para liberar</small></span>
        ${icone('seta')}
      </a>` : ''}
    ${principal}
    ${checkin}
    ${fadiga}
    ${hoje.ultimo ? `
      <a class="lista-item" href="#/treino/${hoje.ultimo.id}/resumo">
        ${icone('relogio')}
        <span class="texto">Último: Treino ${esc(hoje.ultimo.codigo)} · ${esc(hoje.ultimo.nome)}<small class="num">${quando(hoje.ultimo.data)} · ${kg(hoje.ultimo.tonelagem)}</small></span>
        ${icone('seta')}
      </a>` : ''}`;

  el.querySelector('[data-checkin]')?.addEventListener('click', () => abrirCheckin(() => render(el)));

  for (const b of el.querySelectorAll('[data-comecar]')) {
    b.addEventListener('click', async () => {
      b.disabled = true;
      try {
        const corpo = b.dataset.comecar ? { sessao_id: Number(b.dataset.comecar) } : {};
        const ficha = await api('/treinos', { metodo: 'POST', corpo });
        location.hash = `#/treino/${ficha.treino.id}`;
      } catch (e) {
        aviso(e.message, 'erro');
        b.disabled = false;
      }
    });
  }
}
