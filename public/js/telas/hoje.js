// Hoje: o treino do dia pela sequência (docs/03 item 3), continuar o que está aberto, ou escolher outro.
import { api, sessao, ehAdmin } from '../api.js';
import { icone } from '../icones.js';
import { esc, aviso } from '../componentes.js';

export const titulo = 'Hoje';

function quando(data) {
  const hoje = new Date().toLocaleDateString('sv-SE');
  const ontem = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE');
  if (data === hoje) return 'Hoje';
  if (data === ontem) return 'Ontem';
  return data.split('-').reverse().join('/');
}
const kg = (n) => `${Math.round(n).toLocaleString('pt-BR')} kg`;

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

  el.innerHTML = `
    <h2 class="saudacao">Oi, ${esc(primeiroNome)}</h2>
    ${pendentes ? `
      <a class="lista-item destaque" href="#/alunos">
        ${icone('alunos')}
        <span class="texto">${pendentes === 1 ? '1 pessoa aguardando' : `${pendentes} pessoas aguardando`} aprovação<small>Toque para liberar</small></span>
        ${icone('seta')}
      </a>` : ''}
    ${principal}
    ${hoje.ultimo ? `
      <a class="lista-item" href="#/treino/${hoje.ultimo.id}/resumo">
        ${icone('relogio')}
        <span class="texto">Último: Treino ${esc(hoje.ultimo.codigo)} · ${esc(hoje.ultimo.nome)}<small class="num">${quando(hoje.ultimo.data)} · ${kg(hoje.ultimo.tonelagem)}</small></span>
        ${icone('seta')}
      </a>` : ''}`;

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
