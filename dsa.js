const elliptic = require('elliptic');
const crypto = require('crypto');

// Create a DSA instance
const ec = new elliptic.ec('secp256k1');

// Generate DSA key pair
const key = ec.genKeyPair();

const data = 'Hello, this is some data to sign';

// Sign the data
let signature = key.sign(data);

console.log('Data:', data);
console.log('Signature:', {
  r: signature.r.toString('hex'),
  s: signature.s.toString('hex'),
});

// Verify the signature
const isValid = key.verify(data, signature);

console.log('Signature Verified:', isValid);

let publicKey = key.getPublic('hex');
// publicKey ='040b7259ae3a46f37f0ebec3927ae08f6af8491a2358c26beba3b27fd57c7bad5095d6ce9ee0f08b80a52bc9958451cff1af6ea0ad408322e7b78966ed40d414a9'

console.log('Public Key:', publicKey);

const newKey = ec.keyFromPublic(publicKey, 'hex');

const verify = newKey.verify(data,signature)

console.log('Signature Verified:', verify);
