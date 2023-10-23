const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');
const candidates = require('./data/candidates.json');
const voters = require('./data/voters.json');
const { generateElGamalKeys, encrypt } = require('./elgamal');
const {dsaSignature} = require('./dsa')
let registerVoters = require('./data/reg_voters.json');
let regNumbers = require('./data/reg_numbers.json');
let votesData = require('./data/votesdata.json');
let keys, rl;

// Generate candidates and voters
const generateDSAKeys = () => {
  //cec_key
  let { privateKey, publicKey } = crypto.generateKeyPairSync('dsa', {
    modulusLength: 2048,
    namedCurve: 'secp256k1',
  });
  let keys = {
    cec_key: {
      public_key: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
      private_key: privateKey
        .export({ format: 'pem', type: 'pkcs8' })
        .toString(),
    },
    voter_keys: {},
  };
  // for (let voter of voters) {
  //   let { privateKey, publicKey } = crypto.generateKeyPairSync('dsa', {
  //     modulusLength: 2048,
  //     namedCurve: 'secp256k1',
  //   });
  //   keys.voter_keys[voter.id] = {
  //     public_key: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
  //     private_key: privateKey
  //     .export({ format: 'pem', type: 'pkcs8' })
  //     .toString(),
  //   };
  // }

  fs.writeFileSync('./data/keys.json', JSON.stringify(keys));
  console.log('Keys are successfully generated');
  return keys;
};



const chooseAction = async () => {
  let action = await new Promise((resolve) => {
    rl.question(
      `What do you want to do?
1. Request registration number
2. Vote
3. View resultes
`,
      resolve
    );
  });

  if (action === '1') {
    // Request registration number
    // await userAuth('generate ballots');
    await requestRegNumber();
  } else if (action === '2') {
    //vote
    // console.log('you chose to vote');
    await makeVote();
  } else if (action === '3') {
    //view results
    viewResults();
    // console.log('you chose to view results');
  } else {
    console.log('You wrote incorrect option, try again');
    await chooseAction(rl);
  }
};

const viewResults = () => {
  let results = require('./data/results.json');
  if (!results.candidates || !results.votes) {
    console.log("There're no available vote results yet");
    return;
  }
  let resultsStr = 'Results:\n';
  for (let candidate of results.candidates) {
    resultsStr += `Candidate ${candidate.name} : ${candidate.votes} votes\n`;
  }
  resultsStr += '\n\n';
  for (let vote of results.votes) {
    resultsStr += `Voter ${vote.voter_id} voted for ${vote.vote_for}\n`;
  }
  console.log(resultsStr);
};

const userAuth = async (action) => {
  let id = await new Promise((resolve) => {
    rl.question('Write your voter id\n', resolve);
  });
  let privateKey = await new Promise((resolve) => {
    rl.question('Write your private key\n', resolve);
  });

  let voterIndex = voters.findIndex((el) => el.id === parseInt(id));

  if (!voters[voterIndex]) {
    console.log("There's no voter with that id");
    return;
  }
  if (keys.voter_keys[id].private_key != privateKey.replace(/\\n/g, '\n')) {
    console.log('You provided wrong private key');
    return;
  }
  console.log("You've succesfully authorised ");

  if (action === 'vote') {
    await makeVote(id, voterIndex);
  } else if (action === 'generate ballots') {
    await generateBallots(id, voterIndex);
  }
};

const requestRegNumber = async () => {
  let id = await new Promise((resolve) => {
    rl.question('Write your voter id\n', resolve);
  });

  if (parseInt(id) < 1) {
    console.log('Wrong id');
    return;
  }

  registerVoters.push(parseInt(id));

  fs.writeFileSync(
    './data/reg_voters.json',
    JSON.stringify(registerVoters, null, 2)
  );
};

const makeVote = async () => {
  let regNumber = await new Promise((resolve) => {
    rl.question('Write your registration number\n', resolve);
  });

  if (!regNumbers.includes(parseInt(regNumber))) {
    console.log('You wrote wring registration number');
    return;
  }

  let randomId = await new Promise((resolve) => {
    rl.question('Write your random id\n', resolve);
  });

  if (parseInt(randomId) < 1) {
    console.log('You wrote wrong id');
    return;
  }

  let candidatesInfo = '';
  candidates.forEach((el) => {
    candidatesInfo += `№ ${el.id}. ${el.name}\n`;
  });
  console.log(`List of candidates:\n${candidatesInfo}`);

  const voteForId = await new Promise((resolve) => {
    rl.question(
      'Write number of the candidate you want to vote for\n',
      resolve
    );
  });

  const candidateIndex = candidates.findIndex(
    (el) => el.id === parseInt(voteForId)
  );
  if (candidateIndex < 0) {
    console.log("There's no candidate with that id");
    return;
  }

  const voteData = {
    reg_number: parseInt(regNumber),
    voter_id: parseInt(randomId),
    vote_for: parseInt(voteForId),
  };

  const voteMessage = JSON.stringify(voteData);

  const {signature, verifySinature} = dsaSignature(voteMessage) 

  const { q, g, h, key } = generateElGamalKeys();

  const { enMsg, p } = encrypt(voteMessage, q, h, g);

  const encripted = enMsg.map(el => el.toString())

  const strP = p.toString()

  const voteSent = await sendVote({
    hashedMessage: encripted,
    p: p.toString(),
    q: q.toString(),
    key: key.toString(),
    signature,
    verifySinature});
  if (voteSent) {
    console.log('your vote was successfully sent');
    return;
  }

  console.log('Some error occured');
};

const sendVote = async (obj) => {
  if (obj) {
    votesData.push(obj);
    try {
      await fs.writeFileSync(
        './data/votesdata.json',
        JSON.stringify(votesData, null, 2)
      );
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }
};

const main = async () => {
  //import or generate keys
  keys = require('./data/keys.json');
  if (!keys['cec_key']) {
    console.log('no keys, generating new ones');
    keys = await generateDSAKeys();
  }

  rl = readline.createInterface(process.stdin, process.stdout);

  await chooseAction(rl);

  rl.close();
};

(async () => {
  await main();
})();
