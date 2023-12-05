/*
Виконати за алгоритмом RSA конфіденційну комунікацію між Акторами у гіпотетичному Протоколі е-голосування за вказаним Сценарієм.
*/
let BKm = 19,
  Bm = 195,
  BKn = 667,
  BKe = 481,
  BKd = 73,
  Bn = 667,
  Be = 353,
  Bd = 89;

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

const c = modularExponentiation(Bm, Bd, Bn);
console.log(`c: ${c}`);

const c1 = modularExponentiation(c, BKe, BKn);
console.log(`c1: ${c1}`);

console.log(`В передає с = ${c1} до ВК.`);
console.log('ВК дешифрує с1 на власному приватному ключі і видобуває с');

const newC = modularExponentiation(c1, BKd, BKn);
console.log(`new C: ${newC}`);

const mB = modularExponentiation(newC,Be,Bn)
console.log(`mB: ${mB}`);

console.log(`Відповідь: Актор В конфіденційно передав до ВК повідомлення mв=${mB}, підписане своїм ЕЦП.`)
