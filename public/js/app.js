// SPA com rotas por hash (#/hoje, #/evolucao...). Cada tela fica em js/telas/<nome>.js
// e exporta { titulo, larga?, render(el) }.
import { icone } from './icones.js';

// celular: aparece na barra de baixo · desktop: aparece na barra lateral
const ROTAS = [
  { id: 'hoje', rotulo: 'Hoje', celular: true, desktop: true },
  { id: 'evolucao', rotulo: 'Evolução', celular: true, desktop: true },
  { id: 'corpo', rotulo: 'Corpo', celular: true, desktop: true },
  { id: 'perfil', rotulo: 'Perfil', celular: true, desktop: true },
  // DECIDIR: no celular as 4 telas do admin ficam dentro de "Gestão" (5ª aba) para caber em 360px.
  // Na Etapa 1 essa aba e as telas abaixo passam a aparecer só para o admin.
  { id: 'gestao', rotulo: 'Gestão', celular: true, desktop: false, admin: true },
  { id: 'alunos', rotulo: 'Alunos', celular: false, desktop: true, admin: true },
  { id: 'programas', rotulo: 'Programas', celular: false, desktop: true, admin: true },
  { id: 'planilha', rotulo: 'Planilha', celular: false, desktop: true, admin: true },
  { id: 'biblioteca', rotulo: 'Biblioteca', celular: false, desktop: true, admin: true },
];
const INICIAL = 'hoje';

const nav = document.getElementById('nav');
const tela = document.getElementById('tela');
const titulo = document.getElementById('titulo');

function desenharNav() {
  const item = (r) => {
    const classe = r.celular && !r.desktop ? 'so-celular' : !r.celular && r.desktop ? 'so-desktop' : '';
    return `<a class="nav-item ${classe}" href="#/${r.id}" data-rota="${r.id}">${icone(r.id)}<span class="rotulo">${r.rotulo}</span></a>`;
  };
  nav.innerHTML =
    ROTAS.filter((r) => !r.admin).map(item).join('') +
    '<span class="nav-secao">Treinador</span>' +
    ROTAS.filter((r) => r.admin).map(item).join('');
}

function rotaAtual() {
  const id = location.hash.replace(/^#\/?/, '').split('/')[0];
  return ROTAS.some((r) => r.id === id) ? id : INICIAL;
}

let versao = 0;
async function abrir() {
  const id = rotaAtual();
  const minha = ++versao;
  // Abas que ficam "acesas": a tela atual; no celular, Gestão acende nas telas do admin
  const gestaoAcesa = ROTAS.find((r) => r.id === id)?.admin;
  for (const a of nav.querySelectorAll('.nav-item')) {
    const acesa = a.dataset.rota === id || (a.dataset.rota === 'gestao' && gestaoAcesa);
    if (acesa) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  try {
    const modulo = await import(`./telas/${id}.js`);
    if (minha !== versao) return; // o usuário já trocou de tela
    titulo.textContent = modulo.titulo || '';
    document.title = `${modulo.titulo} · SIMEAOBuddy`;
    tela.classList.toggle('larga', Boolean(modulo.larga));
    tela.innerHTML = '';
    tela.style.animation = 'none';
    void tela.offsetWidth; // reinicia a animação de entrada
    tela.style.animation = '';
    await modulo.render(tela);
    window.scrollTo(0, 0);
  } catch (erro) {
    console.error(erro);
    tela.innerHTML = '<section class="card"><h2>Não deu para abrir esta tela</h2><p class="sub">Recarregue a página. Se continuar, avise o Lucas.</p></section>';
  }
}

desenharNav();
if (!location.hash) history.replaceState(null, '', `#/${INICIAL}`);
window.addEventListener('hashchange', abrir);
abrir();
