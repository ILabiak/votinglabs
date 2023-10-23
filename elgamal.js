const crypto = require('crypto');

function gcd(a, b) {
  if (b === 0n) {
    return a;
  } else {
    return gcd(b, a % b);
  }
}

function generateRandomBigInt(bits) {
  let hex = '0x';
  for (let i = 0; i < bits / 4; i++) {
    hex += Math.floor(Math.random() * 16).toString(16);
  }
  return BigInt(hex);
}

function genKey(q) {
  let key;
  do {
    key = generateRandomBigInt(q.toString(16).length);
  } while (gcd(q, key) !== 1n);
  return key;
}

function power(a, b, c) {
  let x = 1n;
  let y = a;
  while (b > 0n) {
    if (b % 2n !== 0n) {
      x = (x * y) % c;
    }
    y = (y * y) % c;
    b = b / 2n;
  }
  return x % c;
}

function encrypt(msg, q, h, g) {
  const enMsg = [];
  const k = genKey(q); // Private key for sender
  const s = power(h, k, q);
  const p = power(g, k, q);

  for (let i = 0; i < msg.length; i++) {
    enMsg.push(msg.charCodeAt(i));
  }

//   console.log('g^k used:', p);
//   console.log('g^ak used:', s);

  for (let i = 0; i < enMsg.length; i++) {
    enMsg[i] = s * BigInt(enMsg[i]);
  }

  return { enMsg, p };
}

function decrypt(enMsg, p, key, q) {
  const drMsg = [];
  const h = power(p, key, q);

  for (let i = 0; i < enMsg.length; i++) {
    drMsg.push(String.fromCharCode(Number(enMsg[i] / h)));
  }

  return drMsg.join('');
}

// function main() {
//     const msg = JSON.stringify({
//         as: 'sdf',
//         asf: 234
//     });
//     console.log('Original Message:', msg);

//     const q = generateRandomBigInt(256); // Adjust the number of bits as needed
//     const g = generateRandomBigInt(q.toString(16).length);

//     const key = genKey(q); // Private key for receiver
//     const h = power(g, key, q);

//     console.log('g used:', g);
//     console.log('g^a used:', h);

//     const { enMsg, p } = encrypt(msg, q, h, g);
//     const drMsg = decrypt(enMsg, p, key, q);
//     console.log('Decrypted Message:', drMsg);
// }

// main();

const generateElGamalKeys = () => {
  const q = generateRandomBigInt(256);
  const g = generateRandomBigInt(q.toString(16).length);

  const key = genKey(q); // Private key for receiver
  const h = power(g, key, q);
  return { q, g, h, key };
};

module.exports = {
  generateElGamalKeys,
  encrypt,
  decrypt,
};
