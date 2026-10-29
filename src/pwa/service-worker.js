// Monta o /sw.js: o modelo (sw-modelo.js) com a lista de arquivos do app e uma versão tirada do conteúdo deles.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { createHash } from 'node:crypto';

const GUARDAR = /\.(html|css|js|svg|png|webmanifest)$/;

// [{ caminho no disco, url }] de todos os arquivos de uma pasta (com subpastas)
function listar(base, prefixo, pasta = base) {
  const saida = [];
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) saida.push(...listar(base, prefixo, caminho));
    else if (GUARDAR.test(nome)) saida.push({ caminho, url: `${prefixo}/${relative(base, caminho).split(sep).join('/')}` });
  }
  return saida;
}

// publico: pasta public/ · regras: src/treino/ (servida em /js/treino) · chart: o chart.umd.js do node_modules
export function montarServiceWorker({ publico, regras, chart }) {
  const arquivos = [
    ...listar(publico, ''),
    ...listar(regras, '/js/treino'),
    { caminho: chart, url: '/vendor/chart.umd.js' },
  ].sort((a, b) => a.url.localeCompare(b.url));

  const hash = createHash('sha256');
  for (const a of arquivos) hash.update(a.url).update(readFileSync(a.caminho));
  const versao = hash.digest('hex').slice(0, 12);

  const modelo = readFileSync(new URL('./sw-modelo.js', import.meta.url), 'utf8');
  return {
    versao,
    urls: arquivos.map((a) => a.url),
    codigo: modelo.replace("'__VERSAO__'", JSON.stringify(versao)).replace('__ARQUIVOS__', JSON.stringify(arquivos.map((a) => a.url), null, 2)),
  };
}
