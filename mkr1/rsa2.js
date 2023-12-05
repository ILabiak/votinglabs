/*
Завдання. Виконати за алгоритмом RSA комунікацію між Акторами у гіпотетичному Протоколі е-голосування за вказаним Сценарієм.
*/
let BKm = 22,
  Bm = 223,
  BKn = 391,
  BKe = 157,
  BKd = 213,
  Bn = 667,
  Be = 39,
  Bd = 79;

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

//СЦЕНАРІЙ 2 ОБЕРЕЖНО

const c = modularExponentiation(Bm,Bd,Bn);
console.log(`c: ${c}`);

console.log(`В передає с = ${c} до ВК.`)

const m = modularExponentiation(c,Be,Bn)
console.log(`m: ${m}`);

console.log(`Відповідь: В передав до ВК повідомлення mв=${m}, підписане своїм ЕЦП.`)