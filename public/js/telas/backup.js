// Backup (admin): baixar tudo em JSON e restaurar a partir de um arquivo.
import { api } from '../api.js';
import { icone } from '../icones.js';
import { esc, aviso } from '../componentes.js';

export const titulo = 'Backup';

export function render(el) {
  el.innerHTML = `
    <section class="card">
      <h2>Baixar backup</h2>
      <p class="sub">Um arquivo .json com tudo: pessoas, anamneses, biblioteca, programas, treinos, check-ins, peso e medidas.
        Guarde no Google Drive ou num pendrive. As fotos não entram (ficam na pasta <code>data/fotos</code> do PC).</p>
      <a class="botao principal cheio" href="/api/backup" download>${icone('baixar')}Baixar backup</a>
    </section>

    <form class="card form" id="form-restaurar">
      <h2>Restaurar backup</h2>
      <p class="sub">Troca <b>todos</b> os dados do app pelos do arquivo. Antes, o app guarda uma cópia do banco atual
        em <code>data/backups/</code>, então dá para voltar atrás.</p>
      <label class="botao cheio" for="arquivo">${icone('enviar')}<span id="nome-arquivo">Escolher arquivo .json</span></label>
      <input id="arquivo" type="file" accept=".json,application/json" hidden>
      <p class="dica" id="resumo" hidden></p>
      <label>Para confirmar, digite RESTAURAR<input name="confirmar" autocomplete="off" autocapitalize="characters" required></label>
      <p class="erro-msg" id="erro" role="alert" hidden></p>
      <button class="botao cheio" type="submit" id="restaurar" disabled>${icone('atualizar')}Restaurar</button>
    </form>`;

  const form = el.querySelector('#form-restaurar');
  const erro = el.querySelector('#erro');
  const resumo = el.querySelector('#resumo');
  const botao = el.querySelector('#restaurar');
  let backup = null;

  const mostrarErro = (t) => { erro.textContent = t; erro.hidden = !t; };

  el.querySelector('#arquivo').addEventListener('change', async (ev) => {
    const arquivo = ev.target.files[0];
    backup = null;
    botao.disabled = true;
    resumo.hidden = true;
    mostrarErro('');
    if (!arquivo) return;
    el.querySelector('#nome-arquivo').textContent = arquivo.name;
    try {
      backup = JSON.parse(await arquivo.text());
    } catch {
      return mostrarErro('Este arquivo não é um backup válido (.json).');
    }
    if (backup?.app !== 'SIMEAOBuddy' || !backup.tabelas) {
      backup = null;
      return mostrarErro('Este arquivo não é um backup do SIMEAOBuddy.');
    }
    const t = backup.tabelas;
    const n = (k) => (t[k] || []).length;
    const quando = backup.gerado_em ? new Date(backup.gerado_em).toLocaleString('pt-BR') : '?';
    resumo.innerHTML = `Backup de <b>${esc(quando)}</b>: ${n('usuarios')} pessoas, ${n('programas')} programas,
      ${n('treinos_realizados')} treinos, ${n('series_realizadas')} séries, ${n('pesos')} pesos.`;
    resumo.hidden = false;
    botao.disabled = false;
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    mostrarErro('');
    const confirmar = new FormData(form).get('confirmar').trim().toUpperCase();
    if (confirmar !== 'RESTAURAR') return mostrarErro('Digite RESTAURAR para confirmar.');
    if (!backup) return mostrarErro('Escolha o arquivo de backup.');
    botao.disabled = true;
    try {
      const r = await api('/backup/restaurar', { metodo: 'POST', corpo: { confirmar, backup } });
      aviso('Backup restaurado!');
      resumo.innerHTML = `Pronto! O banco antigo ficou guardado em <code>${esc(r.copia)}</code>.`;
      form.reset();
      backup = null;
      el.querySelector('#nome-arquivo').textContent = 'Escolher arquivo .json';
    } catch (e) {
      if (e.status === 401) return location.reload(); // o admin mudou no backup: entrar de novo
      mostrarErro(e.message);
      botao.disabled = false;
    }
  });
}
