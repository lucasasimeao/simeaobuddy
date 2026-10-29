// Ficha para imprimir ou salvar em PDF. #/imprimir → o programa ativo de quem está logado; #/imprimir/7 → o programa 7.
// Na impressão o fundo fica branco (tokens de @media print em tema.css) e a navegação some.
import { api, ehAdmin } from '../api.js';
import { icone } from '../icones.js';
import { esc } from '../componentes.js';
import { faixa, segundos } from '../programa-ui.js';

export const titulo = 'Imprimir ficha';
export const larga = true;

const feeders = (item) => [
  item.tem_warmup ? 'Warm up' : null,
  ...item.feeders_efetivas.map((f) => `${f.pct}% × ${f.reps}`),
].filter(Boolean).join(' · ') || '—';

const rir = (w) => {
  if (!w) return '—';
  const partes = [];
  if (w.n_ws) partes.push(`WS ${w.rir_ws}`);
  if (w.n_top) partes.push(`TOP ${w.rir_top}`);
  return partes.join(' · ') || '—';
};

export async function render(el, params) {
  const dados = params[0] ? await api(`/programas/${Number(params[0])}`) : await api('/programas/meu');
  if (!dados.programa) {
    el.innerHTML = '<section class="card vazio"><p>Você ainda não tem um programa ativo. Fale com o Lucas.</p></section>';
    return;
  }
  const { programa, sessoes } = dados;
  const n = programa.n_microciclos;
  const voltar = ehAdmin() ? `#/planilha/${programa.id}` : '#/perfil';

  el.innerHTML = `
    <div class="filtros nao-imprimir">
      <a class="botao" href="${voltar}">${icone('voltar')}Voltar</a>
      <button class="botao principal" id="imprimir">${icone('imprimir')}Imprimir / salvar PDF</button>
    </div>
    <p class="dica nao-imprimir">Para PDF, escolha "Salvar como PDF" na impressora. No celular: menu do navegador → Compartilhar → Imprimir.</p>
    <header class="impressao-topo">
      <h2>${esc(programa.aluno_nome || 'Modelo')} · ${esc(programa.nome)}</h2>
      <p class="sub">${n} microciclos · impresso em ${new Date().toLocaleDateString('pt-BR')}</p>
    </header>
    ${sessoes.map((s) => `
      <section class="card ficha-impressa">
        <h2>Treino ${esc(s.codigo)} · ${esc(s.nome)}</h2>
        <div class="tabela-rolavel"><table class="tabela">
          <thead><tr>
            <th>Nº</th><th class="esq">Exercício</th>
            ${Array.from({ length: n }, (_, i) => `<th>S${i + 1}</th>`).join('')}
            <th>Reps</th><th>RIR</th><th>Descanso</th><th>Cadência</th><th class="esq">Aquecimento</th><th class="esq">Observações</th>
          </tr></thead>
          <tbody>${s.itens.map((item, k) => `<tr>
            <td>${k + 1}</td>
            <td class="esq quebra"><b>${esc(item.exercicio.nome)}</b>${item.exercicio.video_url
              ? ` <a href="${esc(item.exercicio.video_url)}" target="_blank" rel="noopener">vídeo</a>` : ''}</td>
            ${Array.from({ length: n }, (_, i) => `<td>${esc(item.semanas.find((w) => w.microciclo === i + 1)?.descricao ?? '—')}</td>`).join('')}
            <td>${esc(faixa(item))}</td>
            <td>${esc(rir(item.semanas[0]))}</td>
            <td>${segundos(item.descanso_seg)}</td>
            <td>${esc(item.cadencia || '—')}</td>
            <td class="esq quebra">${esc(feeders(item))}</td>
            <td class="esq quebra">${esc(item.observacoes || item.exercicio.observacoes || '')}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </section>`).join('')}
    <p class="dica">WS = série de trabalho · TOP = a última, até a falha (RIR 0) · BO = back-off, −20% da carga do TOP · MR = Muscle Round.
      Aquecimento: % da carga de trabalho × repetições.</p>`;

  el.querySelector('#imprimir').addEventListener('click', () => window.print());
}
