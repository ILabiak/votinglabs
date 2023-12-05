/*
Завдання. Узгодити єдиний секретний ключ К за алгоритмом Діффі-Хеллмана для майбутньої комунікації між Акторами ВК та В 
у гіпотетичному Протоколі е-голосування.
*/
let p = 719, w=11, xvk=134, xv =452;

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

const Yvk = modularExponentiation(w, xvk, p);
console.log(`Yvk: ${Yvk}`);

const Yv = modularExponentiation(w, xv, p);
console.log(`Yvk: ${Yv}`);

const Kvk = modularExponentiation(Yv,xvk,p)
console.log(`Kvk: ${Kvk}`);

const Kv = modularExponentiation(Yvk,xv,p)
console.log(`Kv: ${Kvk}`);