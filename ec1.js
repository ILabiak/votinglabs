const fs = require('fs');
const elliptic = require('elliptic');
let ec1Ballots = require('./data/ec1_ballots.json');
let ec1Results = {};

const dsa = new elliptic.ec('secp256k1');

let votersDone = new Set();

const checkBallots = async () => {
  if (ec1Ballots.length < 1) {
    console.log('no ballots available');
    return;
  }

  for (let ballot of ec1Ballots) {
    const { voterId, msg, signature, publicKey } = ballot;

    if(votersDone.has(voterId)){
        console.log(`Voter with id ${voterId} already sent a vote`)
        continue;
    }

    const dsaKey = dsa.keyFromPublic(publicKey, 'hex');

    try {
      const verify = dsaKey.verify(msg, signature);
      if (!verify) {
        console.log('Ballot signature is not valid');
        continue;
      }

      if (votersDone.has(voterId)) {
        console.log('voter already voted');
        continue;
      }

      ec1Results[voterId] = {
        msg,
      };

      await fs.writeFileSync(
        './data/ec1_results.json',
        JSON.stringify(ec1Results, null, 2)
      );

      votersDone.add(voterId)

      console.log('Verified ballot signature from voter with id:', voterId);
    } catch (err) {
      console.log(err);
      continue;
    }
  }
};

(async () => {
  await checkBallots();
})();
