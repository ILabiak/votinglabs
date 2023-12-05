const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');
const NodeRSA = require('node-rsa');
const elliptic = require('elliptic');
const candidates = require('./data/candidates.json');
const voters = require('./data/voters.json');
let keys;
let ec1Ballots = [];
let ec2Ballots = [];

const dsa = new elliptic.ec('secp256k1');

// Generate candidates and voters
const generateRSAKeys = () => {
  //cec_key
  const key = new NodeRSA({ b: 512 });
  const privateKey = key.exportKey('private');
  const publicKey = key.exportKey('public');
  let keys = {
    cec_key: {
      public_key: publicKey,
      private_key: privateKey,
    },
    voter_keys: {},
  };
  //voter keys
  for (let voter of voters) {
    const key = new NodeRSA({ b: 512 });
    const privateKey = key.exportKey('private');
    const publicKey = key.exportKey('public');
    keys.voter_keys[voter.id] = {
      public_key: publicKey,
      private_key: privateKey,
    };
  }

  fs.writeFileSync('./data/keys.json', JSON.stringify(keys));
  console.log('Keys are successfully generated');
  return keys;
};

function findFactors(number) {
  let factor1 = 1;
  let factor2 = number;

  for (let i = Math.floor(Math.sqrt(number)); i > 1; i--) {
    if (number % i === 0) {
      factor1 = i;
      factor2 = number / i;
      break;
    }
  }
  if (factor1 == 1 || factor2 == 1) {
    return;
  }
  return [factor1, factor2];
}

const makeVote = async (voter, candidateId) => {
  let candidateIndex = candidates.findIndex((el) => el.id === candidateId);
  if (candidateIndex < 0) {
    console.log('There is no candidate with id:', candidateId);
    return;
  }
  const factors = findFactors(candidateId);
  if (!factors || factors.length !== 2) {
    console.log(
      'Candidate id is wrong. Can not find two factors, id:',
      candidateId
    );
    return;
  }
  let voteData1 = {
    voter_id: voter.id,
    vote_for_ec1: factors[0],
  };
  let voteData2 = {
    voter_id: voter.id,
    vote_for_ec2: factors[1],
  };
  let voteMessage1 = JSON.stringify(voteData1);
  let voteMessage2 = JSON.stringify(voteData2);

  let privateKey = keys['voter_keys'][voter.id]?.private_key;
  // console.log(privateKey);

  if (!privateKey) {
    console.log('problem with private key');
    return;
  }

  const cecPublicKeys = keys?.cec_key?.public_key
  const key = new NodeRSA(cecPublicKeys, 'public');
  key.setOptions({ encryptionScheme: 'pkcs1' });

  let encrypted1 = key.encrypt(voteMessage1, 'base64', 'utf-8');
  let encrypted2 = key.encrypt(voteMessage2, 'base64', 'utf-8');

  const dsaKey = dsa.genKeyPair();

  let signature1 = dsaKey.sign(encrypted1);
  let signature2 = dsaKey.sign(encrypted2);

  let publicDSAKey = dsaKey.getPublic('hex');

  const votesSent =  await sendVotes(
    {
      voterId: voter.id,
      msg: encrypted1,
      signature: signature1,
      publicKey: publicDSAKey,
    },
    {
      voterId: voter.id,
      msg: encrypted2,
      signature: signature2,
      publicKey: publicDSAKey,
    }
  );

  if(votesSent){
    console.log('Votes sent successfully, voter id:', voter.id)
    return;
  }

  console.log('Some error occured');
};

const sendVotes = async (ec1Vote, ec2Vote) => {
  if (typeof ec1Vote !== 'object' || typeof ec2Vote !== 'object') {
    console.log('Wrong agruments in sendVotes function');
    return;
  }

  ec1Ballots.push(ec1Vote);
  ec2Ballots.push(ec2Vote);

  try {
    await fs.writeFileSync(
      './data/ec1_ballots.json',
      JSON.stringify(ec1Ballots, null, 2)
    );
    await fs.writeFileSync(
      './data/ec2_ballots.json',
      JSON.stringify(ec2Ballots, null, 2)
    );
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

const main = async () => {
  //import or generate keys
  keys = require('./data/keys.json');
  if (!keys['voter_keys']) {
    console.log('no keys, generating new ones');
    keys = await generateRSAKeys();
  }

  await makeVote(voters[0], 2395283);
  await makeVote(voters[1], 9092835)
  await makeVote(voters[2], 9092835)
  await makeVote(voters[3], 654224)
};

(async () => {
  await main();
})();
