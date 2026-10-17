// Timer de descanso: barra fixa acima da navegação. Conta pelo relógio (não para se a tela apagar um pouco).
// No fim: vibração + um bipe curto (o iPhone não vibra pelo navegador).
let fimEm = 0;
let intervalo = null;
let barra = null;
let rotuloAtual = '';

const formatar = (seg) => `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;

export function vibrar(padrao) {
  try { navigator.vibrate?.(padrao); } catch { /* sem suporte */ }
}

function bipe() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.frequency.value = 880;
    ganho.gain.setValueAtTime(0.15, ctx.currentTime);
    ganho.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(ganho).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch { /* sem áudio */ }
}

function garantirBarra() {
  if (barra?.isConnected) return barra;
  barra = document.createElement('div');
  barra.className = 'timer';
  barra.setAttribute('role', 'timer');
  barra.innerHTML = `
    <div class="timer-info"><small class="timer-rotulo"></small><b class="timer-tempo num"></b></div>
    <button type="button" class="timer-botao" data-mais>+15 s</button>
    <button type="button" class="timer-botao" data-pular>Pular</button>
    <div class="timer-progresso"><span></span></div>`;
  barra.querySelector('[data-mais]').addEventListener('click', () => { fimEm += 15000; tique(); });
  barra.querySelector('[data-pular]').addEventListener('click', parar);
  document.body.append(barra);
  return barra;
}

let total = 1;
function tique() {
  const resta = Math.max(0, Math.ceil((fimEm - Date.now()) / 1000));
  barra.querySelector('.timer-tempo').textContent = formatar(resta);
  barra.querySelector('.timer-rotulo').textContent = rotuloAtual;
  barra.querySelector('.timer-progresso span').style.transform = `scaleX(${Math.min(1, resta / total)})`;
  if (resta <= 0) {
    clearInterval(intervalo);
    intervalo = null;
    vibrar([200, 100, 200]);
    bipe();
    barra.classList.add('acabou');
    barra.querySelector('.timer-rotulo').textContent = 'Descanso acabou';
    barra.querySelector('.timer-tempo').textContent = 'Bora!';
    setTimeout(() => { if (!intervalo) parar(); }, 4000);
  }
}

export function iniciarTimer(segundos, rotulo = 'Descanso') {
  if (!(segundos > 0)) return;
  garantirBarra();
  barra.classList.remove('acabou');
  rotuloAtual = rotulo;
  total = segundos;
  fimEm = Date.now() + segundos * 1000;
  clearInterval(intervalo);
  intervalo = setInterval(tique, 250);
  tique();
}

export function parar() {
  clearInterval(intervalo);
  intervalo = null;
  barra?.remove();
  barra = null;
}

// Sair da ficha esconde o timer
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/treino/')) parar(); });
