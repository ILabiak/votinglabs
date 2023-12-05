/*
Завдання. Виконати за схемою El Gamal конфіденційну комунікацію між Акторами у гіпотетичному Протоколі е-голосування.
*/
let p = 659,
  w = 8,
  xvk = 131,
  xv = 352,
  bb = 17,
  bl = 172;

function modularExponentiation(base, exponent, modulus) {
  if (modulus === 1) return 0;
  let result = 1;
  base = base % modulus;
  while (exponent > 0) {
    if (exponent % 2 === 1) {
      result = (result * base) % modulus;
    }
    exponent = Math.floor(exponent / 2);
    base = (base * base) % modulus;
  }
  return result;
}

//сценарій 1  !!!!!!!!!!! ОБЕРЕЖНО якщо сценарій інший - треба переробити
const Yvk = modularExponentiation(w, xvk, p);
console.log(`Yvk: ${Yvk}`);

const Yv = modularExponentiation(w, xv, p);
console.log(`Yvk: ${Yv}`);

const K = modularExponentiation(Yv, xvk, p);
console.log(`K: ${K}`);

const Kminus1 = modularExponentiation(Yvk, p - 1 - xv, p);
console.log(`K^-1: ${Kminus1}`);

const c = (bb * K) % p;
console.log(`C: ${c}`);

const m = c * Kminus1 % p;
console.log(`m: ${m}`);
