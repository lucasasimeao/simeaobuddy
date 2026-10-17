// Hash de senha com crypto.scrypt. Formato guardado: scrypt$<sal hex>$<hash hex>
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const TAMANHO = 64;

export function gerarHash(senha) {
  const sal = randomBytes(16);
  const hash = scryptSync(senha, sal, TAMANHO);
  return `scrypt$${sal.toString('hex')}$${hash.toString('hex')}`;
}

export function conferirSenha(senha, guardado) {
  const [tipo, salHex, hashHex] = String(guardado || '').split('$');
  if (tipo !== 'scrypt' || !salHex || !hashHex) return false;
  const esperado = Buffer.from(hashHex, 'hex');
  const hash = scryptSync(String(senha), Buffer.from(salHex, 'hex'), esperado.length);
  return timingSafeEqual(hash, esperado);
}

// Regra mínima para a senha do admin
export function senhaValida(senha) {
  return typeof senha === 'string' && senha.length >= 8 && senha.length <= 128;
}
