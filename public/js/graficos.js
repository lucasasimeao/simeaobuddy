// Gráficos (Chart.js) no tema do app. Uma série por gráfico, na cor de destaque; grade e eixos discretos.
// Regras: linha de 2px, pontos ≥ 8px com anel na cor do fundo, barras ≤ 24px com cantos de 4px no topo,
// sem eixo duplo, tooltip sempre ligado e uma tabela com os mesmos números embaixo de cada gráfico.
let carregando;

export function carregarChart() {
  if (window.Chart) return Promise.resolve(window.Chart);
  carregando ||= new Promise((ok, erro) => {
    const s = document.createElement('script');
    s.src = '/vendor/chart.umd.js';
    s.onload = () => ok(window.Chart);
    s.onerror = () => erro(new Error('Não deu para carregar os gráficos.'));
    document.head.append(s);
  });
  return carregando;
}

// Cores e fonte saem dos tokens do tema (nenhuma cor solta aqui)
function cores() {
  const css = getComputedStyle(document.documentElement);
  const v = (n) => css.getPropertyValue(n).trim();
  return { destaque: v('--destaque'), suave: v('--destaque-suave'), texto: v('--texto'), texto2: v('--texto-2'), texto3: v('--texto-3'),
    borda: v('--borda'), superficie: v('--superficie'), superficie2: v('--superficie-2'), fonte: v('--fonte') };
}

const numero = (n, casas = 1) => (n == null ? '—' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: casas }));
const compacto = (n) => (Math.abs(n) >= 1000 ? `${numero(n / 1000)} mil` : numero(n));
export const dataCurta = (d) => d.split('-').reverse().slice(0, 2).join('/');

function base(c, { unidade = '', inteiro = false } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'index', intersect: false },
    layout: { padding: { top: 8, right: 8 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: c.superficie2, borderColor: c.borda, borderWidth: 1, titleColor: c.texto, bodyColor: c.texto2,
        padding: 10, cornerRadius: 10, displayColors: false, titleFont: { family: c.fonte, weight: '600' }, bodyFont: { family: c.fonte },
        callbacks: { label: (ctx) => (ctx.parsed.y == null ? '' : `${ctx.dataset.label}: ${numero(ctx.parsed.y, inteiro ? 0 : 1)}${unidade}`) },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { color: c.borda }, ticks: { color: c.texto3, font: { family: c.fonte, size: 11 }, maxRotation: 0, autoSkipPadding: 12 } },
      y: { grid: { color: c.borda, lineWidth: 1 }, border: { display: false }, ticks: { color: c.texto3, font: { family: c.fonte, size: 11 }, maxTicksLimit: 5, callback: compacto } },
    },
  };
}

const graficos = new WeakMap();
function desenhar(canvas, config) {
  graficos.get(canvas)?.destroy();
  graficos.set(canvas, new window.Chart(canvas, config));
}

// Linha de uma série (ex.: e1RM, uma medida). pontos: [{ x: rótulo, y }]
export async function linha(canvas, pontos, { rotulo, unidade = '', comecarNoZero = false } = {}) {
  await carregarChart();
  const c = cores();
  const cfg = base(c, { unidade });
  cfg.scales.y.beginAtZero = comecarNoZero;
  desenhar(canvas, {
    type: 'line',
    data: { labels: pontos.map((p) => p.x), datasets: [{
      label: rotulo, data: pontos.map((p) => p.y), borderColor: c.destaque, backgroundColor: c.destaque, borderWidth: 2,
      pointRadius: 4, pointHoverRadius: 6, pointBorderColor: c.superficie, pointBorderWidth: 2, pointHitRadius: 14,
      tension: 0, spanGaps: true, borderCapStyle: 'round', borderJoinStyle: 'round',
    }] },
    options: cfg,
  });
}

// Peso: pontos diários (cinza, discretos) + média móvel de 7 dias (linha de destaque). Mesma pessoa, mesma escala.
export async function peso(canvas, serie) {
  await carregarChart();
  const c = cores();
  const cfg = base(c, { unidade: ' kg' });
  cfg.plugins.tooltip.displayColors = false;
  desenhar(canvas, {
    type: 'line',
    data: { labels: serie.map((p) => dataCurta(p.data)), datasets: [
      { label: 'Média de 7 dias', data: serie.map((p) => p.media), borderColor: c.destaque, borderWidth: 2, pointRadius: 0,
        pointHoverRadius: 5, pointHoverBorderColor: c.superficie, pointHoverBorderWidth: 2, pointHoverBackgroundColor: c.destaque, tension: 0.3, order: 1 },
      { label: 'Peso do dia', data: serie.map((p) => p.peso), showLine: false, pointRadius: 4, pointHoverRadius: 6,
        pointBackgroundColor: c.texto3, pointBorderColor: c.superficie, pointBorderWidth: 2, pointHitRadius: 12, order: 2 },
    ] },
    options: cfg,
  });
}

// Colunas de uma série (ex.: tonelagem por microciclo)
export async function colunas(canvas, pontos, { rotulo, unidade = '' } = {}) {
  await carregarChart();
  const c = cores();
  const cfg = base(c, { unidade, inteiro: true });
  cfg.interaction = { mode: 'nearest', intersect: false, axis: 'x' };
  cfg.scales.y.beginAtZero = true;
  desenhar(canvas, {
    type: 'bar',
    data: { labels: pontos.map((p) => p.x), datasets: [{
      label: rotulo, data: pontos.map((p) => p.y), backgroundColor: c.destaque, hoverBackgroundColor: c.destaque,
      maxBarThickness: 24, borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: 'bottom',
    }] },
    options: cfg,
  });
}

// Tabela com os mesmos números do gráfico (acessível e para conferir)
export function tabela(colunasTab, linhas) {
  return `<details class="tabela-grafico"><summary>Ver os números</summary>
    <div class="tabela-rolavel"><table class="tabela num">
      <thead><tr>${colunasTab.map((t) => `<th>${t}</th>`).join('')}</tr></thead>
      <tbody>${linhas.map((l) => `<tr>${l.map((v) => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div></details>`;
}

export { numero };
