const fs = require('fs');
const elliptic = require('elliptic');
let ec2Ballots = require('./data/ec2_ballots.json');
let ec2Results = {};

const dsa = new elliptic.ec('secp256k1');

let votersDone = new Set();

const checkBallots = async () => {
  if (ec2Ballots.length < 1) {
    console.log('no ballots available');
    return;
  }
  let votersDone = new Set();

  for (let ballot of ec2Ballots) {
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

      ec2Results[voterId] = {
        msg,
      };

      await fs.writeFileSync(
        './data/ec2_results.json',
        JSON.stringify(ec2Results, null, 2)
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
