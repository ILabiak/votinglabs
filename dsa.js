const crypto = require('crypto');

const dsaSignature = (msg) => {
  let { privateKey, publicKey } = crypto.generateKeyPairSync('dsa', {
    modulusLength: 2048,
    namedCurve: 'secp256k1',
  });

  const dsa = crypto.createSign('sha512');
  dsa.update(msg);
  const signature = dsa.sign(privateKey);
  console.log(signature);
  return {
    signature,
    verifySinature: publicKey
      .export({ format: 'pem', type: 'spki' })
      .toString(),
  };
};

const verifyDsaSignature = (msg, signature, publicKey) => {
    const verifier = crypto.createVerify('sha512');
    verifier.update(msg);
  
    const isSignatureValid = verifier.verify(publicKey, signature);
    return isSignatureValid;
  };


module.exports = {
  dsaSignature,
  verifyDsaSignature
};
