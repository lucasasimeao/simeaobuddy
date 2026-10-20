// Corpo: peso do dia (rápido), medidas quinzenais e fotos opcionais (docs/03 item 13). Cada um registra o seu.
import { api } from '../api.js';
import { icone } from '../icones.js';
import { esc, aviso } from '../componentes.js';
import { numero, dataCurta } from '../graficos.js';

export const titulo = 'Corpo';

const kg = (n) => `${numero(n)} kg`;
const lerNum = (v) => {
  const n = Number(String(v ?? '').replace(',', '.').trim());
  return String(v ?? '').trim() === '' || !Number.isFinite(n) ? null : n;
};

const pesoHojeOuUltimo = (d) => (d.pesos.find((p) => p.data === d.hoje) || d.pesos.at(-1))?.peso ?? null;

// Reduz a foto no celular (lado maior até 1280 px, JPEG) antes de enviar
function reduzirFoto(arquivo) {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      ok(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => erro(new Error('Não deu para ler essa imagem.'));
    img.src = URL.createObjectURL(arquivo);
  });
}

export async function render(tela) {
  const d = await api('/corpo');
  // Contêiner próprio: ao redesenhar, os eventos antigos vão embora junto (o #tela é reaproveitado)
  const el = document.createElement('div');
  el.className = 'pilha';
  tela.replaceChildren(el);
  const recarregar = () => render(tela);
  const pesoInicial = pesoHojeOuUltimo(d);
  const { avaliacao: av, campos_medidas: campos } = d;
  const ultimoPeso = d.pesos.at(-1);
  const pesoHoje = d.pesos.find((p) => p.data === d.hoje);
  const ultimaMedida = d.medidas.at(-1);
  const anteriorMedida = d.medidas.at(-2);

  const variacaoMedida = (c) => {
    if (!ultimaMedida || ultimaMedida[c.campo] == null || anteriorMedida?.[c.campo] == null) return '';
    const v = Math.round((ultimaMedida[c.campo] - anteriorMedida[c.campo]) * 10) / 10;
    return v ? `<small class="num">${v > 0 ? '+' : ''}${numero(v)}</small>` : '<small>=</small>';
  };

  el.innerHTML = `
    ${av.alerta ? `<section class="card alerta-card"><h2>${icone('alerta')}Peso fora da meta</h2><p>${esc(av.mensagem)}</p>
      <p class="sub">Faz 2 semanas fora do ritmo. Vale rever a dieta.</p></section>` : ''}

    <section class="card">
      <div class="corpo-topo">
        <div>
          <p class="sobre">Peso</p>
          <p class="numero-grande num">${ultimoPeso ? kg(ultimoPeso.peso) : '—'}</p>
          <p class="sub num">${ultimoPeso ? `${ultimoPeso.data === d.hoje ? 'hoje' : dataCurta(ultimoPeso.data)} · média de 7 dias ${kg(av.ultimo.media)}` : 'Nenhum peso registrado ainda'}</p>
        </div>
      </div>
      ${av.mensagem ? `<p class="${av.alerta ? 'aviso-texto' : 'sub'}">${esc(av.mensagem)}</p>` : ''}
      ${!d.objetivo ? '<p class="dica">Sem objetivo na anamnese: o app não compara o ritmo com uma meta.</p>' : ''}
      <form class="form" id="form-peso">
        <div class="campo-num">
          <button type="button" data-passo="-0.1" aria-label="Menos 100 g">−</button>
          <label><input id="peso" inputmode="decimal" value="${pesoInicial == null ? '' : esc(numero(pesoInicial))}" placeholder="kg" aria-label="Peso de hoje (kg)"><small>kg ${pesoHoje ? '· já registrado hoje' : 'hoje'}</small></label>
          <button type="button" data-passo="0.1" aria-label="Mais 100 g">+</button>
        </div>
        <button class="botao principal cheio">${icone('ok')}${pesoHoje ? 'Corrigir o peso de hoje' : 'Salvar peso de hoje'}</button>
      </form>
      ${d.pesos.length ? `<details><summary class="resumo-detalhe">Últimos registros</summary>
        <div class="lista">${d.pesos.slice(-10).reverse().map((p) => `
          <div class="lista-item compacto"><span class="texto num">${dataCurta(p.data)} · ${kg(p.peso)}</span>
            <button type="button" class="botao-icone perigo" data-apagar-peso="${p.data}" aria-label="Apagar o peso de ${dataCurta(p.data)}">${icone('fechar')}</button></div>`).join('')}</div>
      </details>` : ''}
    </section>

    <section class="card">
      <div class="linha-titulo"><h2>Medidas</h2><span class="sub">${ultimaMedida ? dataCurta(ultimaMedida.data) : 'a cada 15 dias'}</span></div>
      ${ultimaMedida ? `<div class="grade-medidas num">${campos.filter((c) => ultimaMedida[c.campo] != null).map((c) => `
        <div><span>${esc(c.texto)}</span><b>${numero(ultimaMedida[c.campo])}${c.unidade || ' cm'}</b>${variacaoMedida(c)}</div>`).join('')}</div>`
        : '<p class="sub">Meça cintura, peito, braço, coxa, quadril e panturrilha a cada 15 dias, sempre do mesmo jeito.</p>'}
      <button class="botao cheio" id="medir">${icone('mais')}Registrar medidas</button>
      <a class="botao cheio leve-botao" href="#/evolucao">${icone('evolucao')}Ver os gráficos</a>
    </section>

    <section class="card">
      <div class="linha-titulo"><h2>Fotos</h2><span class="sub">opcional · só você e o Lucas veem</span></div>
      ${d.fotos.length ? `<div class="grade-fotos">${d.fotos.map((f) => `
        <figure><a href="/api/corpo/fotos/${f.id}" target="_blank" rel="noopener"><img src="/api/corpo/fotos/${f.id}" alt="Foto de ${dataCurta(f.data)}" loading="lazy"></a>
          <figcaption class="num">${dataCurta(f.data)}<button type="button" class="botao-icone perigo" data-apagar-foto="${f.id}" aria-label="Apagar a foto">${icone('fechar')}</button></figcaption></figure>`).join('')}</div>` : ''}
      <label class="botao cheio">${icone('mais')}Adicionar foto<input type="file" id="foto" accept="image/*" hidden></label>
    </section>`;

  const inputPeso = el.querySelector('#peso');
  el.querySelector('#form-peso').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-passo]');
    if (!b) return;
    const atual = lerNum(inputPeso.value) ?? ultimoPeso?.peso ?? 70;
    inputPeso.value = numero(Math.round((atual + Number(b.dataset.passo)) * 10) / 10);
  });
  el.querySelector('#form-peso').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try {
      await api('/corpo/peso', { metodo: 'PUT', corpo: { peso: lerNum(inputPeso.value) } });
      aviso('Peso salvo.');
      recarregar();
    } catch (e) { aviso(e.message, 'erro'); }
  });

  el.addEventListener('click', async (ev) => {
    const p = ev.target.closest('[data-apagar-peso]');
    const f = ev.target.closest('[data-apagar-foto]');
    try {
      if (p && confirm(`Apagar o peso de ${dataCurta(p.dataset.apagarPeso)}?`)) {
        await api(`/corpo/peso/${p.dataset.apagarPeso}`, { metodo: 'DELETE' });
        recarregar();
      }
      if (f && confirm('Apagar esta foto?')) {
        await api(`/corpo/fotos/${f.dataset.apagarFoto}`, { metodo: 'DELETE' });
        recarregar();
      }
    } catch (e) { aviso(e.message, 'erro'); }
  });

  el.querySelector('#medir').addEventListener('click', () => medir(campos, ultimaMedida, d.hoje, recarregar));

  el.querySelector('#foto').addEventListener('change', async (ev) => {
    const arquivo = ev.target.files?.[0];
    if (!arquivo) return;
    try {
      const imagem = await reduzirFoto(arquivo);
      await api('/corpo/fotos', { metodo: 'POST', corpo: { imagem } });
      aviso('Foto salva.');
      recarregar();
    } catch (e) { aviso(e.message, 'erro'); }
  });
}

// Diálogo das medidas (já vem com as últimas, para só corrigir o que mudou)
function medir(campos, ultima, hoje, depois) {
  const dialogo = document.createElement('dialog');
  dialogo.className = 'dialogo';
  dialogo.innerHTML = `
    <form class="form" method="dialog">
      <h2>Medidas</h2>
      <label>Data<input type="date" name="data" value="${hoje}" max="${hoje}"></label>
      <div class="grade-campos">${campos.map((c) => `
        <label>${esc(c.texto)} (${c.unidade || 'cm'})<input name="${c.campo}" inputmode="decimal" value="${esc(ultima?.[c.campo] != null ? numero(ultima[c.campo]) : '')}" placeholder="${c.campo === 'gordura' ? 'opcional' : ''}"></label>`).join('')}</div>
      <label>Observação<input name="observacao" maxlength="300" placeholder="Ex.: medido de manhã, em jejum"></label>
      <button type="submit" class="botao principal cheio">${icone('ok')}Salvar medidas</button>
      <button type="button" class="botao" data-fechar>Cancelar</button>
    </form>`;
  document.body.append(dialogo);
  dialogo.showModal();
  dialogo.addEventListener('close', () => dialogo.remove());
  dialogo.querySelector('[data-fechar]').addEventListener('click', () => dialogo.close());
  dialogo.querySelector('form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const corpo = { data: f.get('data'), observacao: f.get('observacao') };
    for (const c of campos) corpo[c.campo] = lerNum(f.get(c.campo));
    try {
      await api('/corpo/medidas', { metodo: 'PUT', corpo });
      dialogo.close();
      aviso('Medidas salvas.');
      depois();
    } catch (e) { aviso(e.message, 'erro'); }
  });
}
