/*
Завдання. Виконати за алгоритмом RSA конфіденційну комунікацію між Акторами у гіпотетичному Протоколі е-голосування за вказаним Сценарієм.
*/
let BBm = 19,
  BLm = 195,
  BKn = 667,
  BKe = 481,
  BKd = 73,
  Bn = 391,
  Be = 345,
  Bd = 201;

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

//СЦЕНАРІЙ 1 ОБЕРЕЖНО

const c = modularExponentiation(BBm,Be,Bn);
console.log(`c: ${c}`);

console.log(`ВК передає с = ${c} до Виборця В`)

const m = modularExponentiation(c,Bd,Bn)
console.log(`m: ${m}`);

console.log(`Відповідь: ВК конфіденційно передала бланк бюлетеня BB = m = ${m} виборцю В.`)