// SPA com rotas por hash (#/hoje, #/alunos/3...). Cada tela fica em js/telas/<nome>.js
// e exporta { titulo, larga?, render(el, params) }.
import { icone } from './icones.js';
import { api, sessao } from './api.js';

// celular: aparece na barra de baixo · desktop: aparece na barra lateral · admin: só para o treinador
const ROTAS = [
  { id: 'hoje', rotulo: 'Hoje', celular: true, desktop: true },
  { id: 'evolucao', rotulo: 'Evolução', celular: true, desktop: true },
  { id: 'corpo', rotulo: 'Corpo', celular: true, desktop: true },
  { id: 'perfil', rotulo: 'Perfil', celular: true, desktop: true },
  // No celular as 4 telas do admin ficam dentro de "Gestão" (5ª aba) para caber em 360px.
  { id: 'gestao', rotulo: 'Gestão', celular: true, desktop: false, admin: true },
  { id: 'alunos', rotulo: 'Alunos', celular: false, desktop: true, admin: true },
  { id: 'programas', rotulo: 'Programas', celular: false, desktop: true, admin: true },
  { id: 'planilha', rotulo: 'Planilha', celular: false, desktop: true, admin: true },
  { id: 'biblioteca', rotulo: 'Biblioteca', celular: false, desktop: true, admin: true },
  // Telas sem aba própria (acendem a aba "pai")
  { id: 'treino', oculta: true, pai: 'hoje' },
];
const INICIAL = 'hoje';

const nav = document.getElementById('nav');
const tela = document.getElementById('tela');
const titulo = document.getElementById('titulo');

function rotasPermitidas() {
  return ROTAS.filter((r) => !r.admin || sessao.usuario?.papel === 'admin');
}

function desenharNav() {
  const rotas = rotasPermitidas().filter((r) => !r.oculta);
  const item = (r) => {
    const classe = r.celular && !r.desktop ? 'so-celular' : !r.celular && r.desktop ? 'so-desktop' : '';
    return `<a class="nav-item ${classe}" href="#/${r.id}" data-rota="${r.id}">${icone(r.id)}<span class="rotulo">${r.rotulo}</span></a>`;
  };
  const admin = rotas.filter((r) => r.admin);
  nav.innerHTML = rotas.filter((r) => !r.admin).map(item).join('') +
    (admin.length ? '<span class="nav-secao">Treinador</span>' + admin.map(item).join('') : '');
}

// "#/alunos/3?x=1" → { id: 'alunos', params: ['3'], busca: URLSearchParams }
function lerHash() {
  const [caminho, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const [id, ...params] = caminho.split('/');
  return { id, params, busca: new URLSearchParams(query) };
}

let versao = 0;
async function mostrar(id, params, busca) {
  const minha = ++versao;
  const rota = ROTAS.find((r) => r.id === id);
  for (const a of nav.querySelectorAll('.nav-item')) {
    const acesa = a.dataset.rota === id || a.dataset.rota === rota?.pai || (a.dataset.rota === 'gestao' && rota?.admin);
    if (acesa) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  try {
    const modulo = await import(`./telas/${id}.js`);
    if (minha !== versao) return; // o usuário já trocou de tela
    titulo.textContent = modulo.titulo || '';
    document.title = modulo.titulo ? `${modulo.titulo} · SIMEAOBuddy` : 'SIMEAOBuddy';
    tela.classList.toggle('larga', Boolean(modulo.larga));
    tela.innerHTML = '';
    tela.style.animation = 'none';
    void tela.offsetWidth; // reinicia a animação de entrada
    tela.style.animation = '';
    await modulo.render(tela, params, busca);
    window.scrollTo(0, 0);
  } catch (erro) {
    console.error(erro);
    if (erro.status === 401) return iniciar();
    tela.innerHTML = '<section class="card"><h2>Não deu para abrir esta tela</h2><p class="sub">Recarregue a página. Se continuar, avise o Lucas.</p></section>';
  }
}

function abrir() {
  const { id, params, busca } = lerHash();
  if (!sessao.usuario) return mostrar('login', [], busca);
  if (sessao.usuario.status === 'pendente') return mostrar('aguardando', [], busca);
  const permitida = rotasPermitidas().some((r) => r.id === id);
  if (!permitida) {
    history.replaceState(null, '', `#/${INICIAL}`);
    return mostrar(INICIAL, [], busca);
  }
  mostrar(id, params, busca);
}

// Descobre quem está logado e monta a navegação
export async function iniciar() {
  try {
    sessao.usuario = (await api('/auth/eu')).usuario;
  } catch {
    sessao.usuario = null;
  }
  const logado = sessao.usuario && sessao.usuario.status === 'ativo';
  document.body.classList.toggle('sem-nav', !logado);
  if (logado) desenharNav();
  else nav.innerHTML = '';
  abrir();
}

window.addEventListener('hashchange', abrir);
if (!location.hash) history.replaceState(null, '', `#/${INICIAL}`);
iniciar();
