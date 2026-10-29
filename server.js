// Inicia o servidor. Escuta em 0.0.0.0 para o celular acessar pela Wi-Fi.
import { networkInterfaces } from 'node:os';
import { abrirBanco } from './src/db/conexao.js';
import { criarApp } from './src/app.js';

const PORTA = Number(process.env.PORT) || 3100;
const db = abrirBanco();
const app = criarApp(db);

function enderecosDaRede() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

const servidor = app.listen(PORTA, '0.0.0.0', () => {
  console.log('\n  SIMEAOBuddy rodando!');
  console.log(`  No PC:      http://localhost:${PORTA}`);
  for (const ip of enderecosDaRede()) console.log(`  No celular: http://${ip}:${PORTA}`);
  console.log(`  Banco:      ${process.env.DB_PATH || 'data/treino.db'}`);
  console.log('\n  Para parar: Ctrl+C\n');
});

servidor.on('error', (erro) => {
  if (erro.code === 'EADDRINUSE') {
    console.error(`\n  A porta ${PORTA} já está em uso por outro programa.`);
    console.error('  Feche o outro programa ou escolha outra porta, ex. no PowerShell: $env:PORT=3200; npm start\n');
    process.exit(1);
  }
  throw erro;
});
