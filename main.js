const NodeRSA = require('node-rsa');
const fs = require('fs');
const readline = require('readline');
const candidates = require('./data/candidates.json');
const voters = require('./data/voters.json');
let votesData = require('./data/votesdata.json');
let ballots = require('./data/ballots.json');
let ballotKeys = require('./data/ballot_keys.json')
let keys, rl;

const { xorEncrypt } = require('./utils');

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

const chooseAction = async () => {
  let action = await new Promise((resolve) => {
    rl.question(
      `What do you want to do?
1. Generate and send ballots
2. Vote
3. View resultes
`,
      resolve
    );
  });

  if (action === '1') {
    // generate and send ballots to CEC
    await userAuth('generate ballots');
  } else if (action === '2') {
    //vote
    // console.log('you chose to vote');
    await userAuth('vote');
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
  if (!results[0]) {
    console.log("There're no available vote results yet");
    return;
  }
  let resultsStr = 'Results:\n';
  for (let res of results) {
    resultsStr += `Candidate ${res.name} : ${res.votes} votes\n`;
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
    // console.dir({
    //   voter_pk: keys.voter_keys[id].private_key,
    //   provided_pk: privateKey.replace(/\\n/g, '\n'),
    // });
    return;
  }
  console.log("You've succesfully authorised ");

  if (action === 'vote') {
    await makeVote(id, voterIndex);
  } else if (action === 'generate ballots') {
    await generateBallots(id, voterIndex);
  }
};

const makeVote = async (id, voterIndex) => {
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

  const voterdata = {
    ...voters[voterIndex],
    vote_for: parseInt(voteForId),
  };

  const message = JSON.stringify(voterdata);

  //hash message
  const hashedMessage = await xorEncrypt(message, keys.cec_key.public_key);

  // sign message with electronic signature
  let key = new NodeRSA(keys.voter_keys[id].private_key, 'private');
  const signature = key.sign(hashedMessage, 'hex');

  const voteSent = await sendVote({ hashedMessage, signature });

  if (voteSent) {
    console.log(
      `Your vote for ${candidates[candidateIndex].name} has been sent to CEC`
    );
    return;
  }
  console.log('Error while sending vote');
};

const sendVote = async (obj) => {
  if (obj?.hashedMessage && obj?.signature) {
    votesData.push(obj);
    try {
      await fs.writeFile(
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

const generateBallots = async (id, voterIndex) => {
  // let key = new NodeRSA(keys.voter_keys[id].private_key, 'private');
  // key.setOptions({encryptionScheme: 'pkcs1'})
  let ballotsObj = {
    voter_id: id,
    // public_key: key.exportKey('public'),
    ballots: [],
  };
  ballotKeys[id] = {}
  for (let i = 1; i <= 10; i++) {
    const key = new NodeRSA({ b: 512 });
    key.setOptions({encryptionScheme: 'pkcs1'});
    let ballot = {ballot_id: i, messages :[]};
    for (let candidate of candidates) {
      const voterdata = {
        ...voters[voterIndex],
        vote_for: candidate.id,
      };
      ballotKeys[id][i] = key.exportKey('private')

      const message = JSON.stringify(voterdata);
      const encrypted = key.encrypt(message, 'base64', 'utf-8');
      ballot.messages.push(encrypted);
    }
    ballotsObj.ballots.push(ballot);
  }
  // console.log('Ballot\n', JSON.stringify(ballotsObj, null, 2));
  ballots.push(ballotsObj);
  fs.writeFileSync('./data/ballots.json', JSON.stringify(ballots, null, 2));
  fs.writeFileSync('./data/ballot_keys.json', JSON.stringify(ballotKeys, null, 2));
  console.log('Your ballots were successfully created and sent to CEC')
};

const main = async () => {
  //import or generate keys
  keys = require('./data/keys.json');
  if (!keys['cec_key'] || !keys['voter_keys']) {
    console.log('no keys, generating new ones');
    keys = await generateRSAKeys();
  }

  rl = readline.createInterface(process.stdin, process.stdout);

  await chooseAction(rl);

  rl.close();
};

(async () => {
  await main();
})();
