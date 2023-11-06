const bigInt = require('big-integer');
const crypto = require('crypto');

function isPrime(n) {
  if (n <= 1) return false;
  if (n <= 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  let i = 5;
  while (i * i <= n) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
    i += 6;
  }
  return true;
}

function generateLargePrime() {
  let p;
  do {
    p = bigInt.randBetween(1000, 10000);
  } while (!isPrime(p));
  return p;
}

function generateG(p) {
  let g;
  do {
    g = bigInt.randBetween(2, p.minus(1));
  } while (
    bigInt(g).modPow(p.minus(1).divide(2), p).notEquals(1) ||
    bigInt(g).modPow(p.minus(1), p).notEquals(1)
  );
  return g;
}

function generatePrivateKey(p) {
  return bigInt.randBetween(2, p.minus(2));
}

function generatePublicKey(p, g, x) {
  return bigInt(g).modPow(x, p);
}

function encrypt(p, g, y, plaintext) {
  let k = generatePrivateKey(p);
  let c1 = bigInt(g).modPow(k, p);
  let s = bigInt(y).modPow(k, p);
  let c2 = plaintext
    .split('')
    .map((char) => bigInt(char.charCodeAt(0)).multiply(s).mod(p));
  return { c1, c2 };
}

function decrypt(p, x, c1, c2) {
  let s = bigInt(c1).modPow(x, p);
  let decryptedText = c2.map((charBigInt) =>
    String.fromCharCode(bigInt(charBigInt).multiply(bigInt(s).modInv(p)).mod(p))
  );
  return decryptedText.join('');
}

function generateCoprimeK(p) {
  let k;
  do {
    k = generatePrivateKey(p);
  } while (
    k.equals(0) ||
    k.greaterOrEquals(p.minus(1)) ||
    !isCoprime(k, p.minus(1))
  );
  return k;
}

function isCoprime(a, b) {
  while (b.neq(0)) {
    const temp = a;
    a = b;
    b = temp.mod(b);
  }
  return a.eq(1);
}

function sign(p, g, x, message) {
  const hash = crypto.createHash('sha256').update(message).digest('hex');
  const m = bigInt(hash, 16);

  let r, s;
  let k = generateCoprimeK(p);
  r = bigInt(g).modPow(k, p);
  const kInv = k.modInv(p.minus(1));
  s = m.minus(x.times(r)).times(kInv).mod(p.minus(1));
  return { r, s };
}

function verify(p, g, y, message, signature) {
  const { r, s } = signature;
  if (r.greater(p) || s.greater(p.minus(1))) {
    return false;
  }
  const hash = crypto.createHash('sha256').update(message).digest('hex');
  const m = bigInt(hash, 16);

  const leftSide = bigInt(y).modPow(r, p).times(r.modPow(s, p)).mod(p);
  const rightSide = bigInt(g).modPow(m, p);
  return leftSide.equals(rightSide);
}

function generateKeys() {
  const p = generateLargePrime();
  const g = generateG(p);
  const x = generatePrivateKey(p);
  const y = generatePublicKey(p, g, x);
  return { p, g, x, y };
}

function main() {
  const { p, g, x, y } = generateKeys();
  console.log('Відкритий ключ (p, g, y):', { p, g, y });
  console.log('Закритий ключ x:', x);

  const messageToSign = 'This is a signed message.';
  const signature = sign(p, g, x, messageToSign);
  // signature.r = bigInt(23423442);
  const isSignatureValid = verify(p, g, y, messageToSign, signature);

  console.log('Створений підпис:', signature);
  console.log(
    'Перевірка підпису:',
    isSignatureValid ? 'Підпис дійсний' : 'Підпис недійсний'
  );
}

// main()

module.exports = {
  generateKeys,
  sign,
  verify,
};
