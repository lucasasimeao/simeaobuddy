// Perfil: seus dados. Aluno vê a anamnese (só leitura); o admin troca a senha.
import { api, sessao, ehAdmin } from '../api.js';
import { icone } from '../icones.js';
import { esc, avatar, aviso } from '../componentes.js';
import { iniciar } from '../app.js';

export const titulo = 'Perfil';

const ROTULOS = {
  objetivo: ['Objetivo', { emagrecimento: 'Emagrecimento', hipertrofia: 'Hipertrofia' }],
  nivel: ['Nível', { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' }],
  sexo: ['Sexo', { M: 'Masculino', F: 'Feminino', outro: 'Outro' }],
  nascimento: ['Nascimento'],
  altura_cm: ['Altura', null, ' cm'],
  peso_kg: ['Peso', null, ' kg'],
  dias_semana: ['Dias por semana'],
  minutos_sessao: ['Minutos por treino', null, ' min'],
  meta_texto: ['Meta'],
  meta_peso: ['Meta de peso', null, ' kg'],
  restricoes: ['Lesões / restrições'],
  evitar: ['Exercícios a evitar'],
  equipamentos: ['Equipamentos'],
  preferencias: ['Preferências'],
};

function valor(campo, v) {
  const [, mapa, sufixo = ''] = ROTULOS[campo];
  if (campo === 'nascimento') return v.split('-').reverse().join('/');
  return (mapa ? mapa[v] : String(v).replace('.', ',')) + sufixo;
}

export async function render(el) {
  const u = sessao.usuario;
  let blocoAnamnese = '';
  if (!ehAdmin()) {
    const { anamnese } = await api(`/alunos/${u.id}`);
    const linhas = Object.keys(ROTULOS).filter((c) => anamnese[c] !== null && anamnese[c] !== undefined && anamnese[c] !== '');
    blocoAnamnese = `
      <section class="card">
        <h2>Minha anamnese</h2>
        ${linhas.length
          ? `<dl class="dados">${linhas.map((c) => `<div><dt>${ROTULOS[c][0]}</dt><dd>${esc(valor(c, anamnese[c]))}</dd></div>`).join('')}</dl>`
          : '<p class="sub">O Lucas ainda vai preencher.</p>'}
        <p class="dica">Precisa mudar algo? Fale com o Lucas.</p>
      </section>`;
  }

  el.innerHTML = `
    <section class="card">
      <div class="pessoa">
        ${avatar(u, 56)}
        <div><h2>${esc(u.nome)}</h2><p class="sub">${esc(ehAdmin() ? 'Treinador (admin)' : u.email || 'Aluno')}</p></div>
      </div>
    </section>
    ${blocoAnamnese}
    ${ehAdmin() ? `
      <form class="card form" id="form-senha">
        <h2>Trocar senha</h2>
        <label>Senha atual<input name="atual" type="password" autocomplete="current-password" required></label>
        <label>Senha nova<input name="nova" type="password" autocomplete="new-password" minlength="8" required></label>
        <p class="erro-msg" id="erro" role="alert" hidden></p>
        <button class="botao principal cheio" type="submit">${icone('chave')}Trocar senha</button>
      </form>` : ''}
    <button class="botao cheio" id="sair">${icone('sair')}Sair</button>`;

  el.querySelector('#sair').addEventListener('click', async () => {
    await api('/auth/sair', { metodo: 'POST' }).catch(() => {});
    history.replaceState(null, '', '#/hoje');
    iniciar();
  });

  const form = el.querySelector('#form-senha');
  form?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const erro = el.querySelector('#erro');
    erro.hidden = true;
    try {
      await api('/auth/senha', { metodo: 'PUT', corpo: Object.fromEntries(new FormData(form)) });
      form.reset();
      aviso('Senha trocada!');
    } catch (e) {
      erro.textContent = e.message;
      erro.hidden = false;
    }
  });
}
