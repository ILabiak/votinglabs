const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');
const NodeRSA = require('node-rsa');
const candidates = require('./data/candidates.json');
const voters = require('./data/voters.json');
const elGamal = require('./elgamal');
const bigInt = require('big-integer');
let keys, rl;
let randomLines = [];
let ballots = [];
let signatures = {};
let results = { candidates: [], votes: [] };

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

// Generate candidates and voters
const generateRSAKeys = () => {
  let keys = {
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

  fs.writeFileSync('./data/keys.json', JSON.stringify(keys, null, 2));
  console.log('Keys are successfully generated');
  return keys;
};

function generateRandomLine(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let randomLine = '/';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomLine += characters.charAt(randomIndex);
  }

  return randomLine;
}

const makeVote = async () => {
  const voteData = {
    reg_number: parseInt(regNumber),
    voter_id: parseInt(randomId),
    vote_for: parseInt(voteForId),
  };

  const voteMessage = JSON.stringify(voteData);

  const { signature, verifySinature } = dsaSignature(voteMessage);

  const { q, g, h, key } = generateElGamalKeys();

  const { enMsg, p } = encrypt(voteMessage, q, h, g);

  const encripted = enMsg.map((el) => el.toString());

  const voteSent = await sendVote({
    hashedMessage: encripted,
    p: p.toString(),
    q: q.toString(),
    key: key.toString(),
    signature,
    verifySinature,
  });
  if (voteSent) {
    console.log('your vote was successfully sent');
    return;
  }

  console.log('Some error occured');
};

const generateAndEncryptBallot = async (voter, candidateId) => {
  voter.ballots = [];
  let voteData = {
    voter_id: voter.id,
    vote_for: candidateId,
  };
  let voteMsg = JSON.stringify(voteData);
  let randomLine = generateRandomLine(10);
  voteMsg += randomLine;
  voter.ballots.push(voteMsg);
  randomLines.push(randomLine);

  for (let i = voters.length - 1; i >= 0; i--) {
    let voterPbKey = keys['voter_keys'][voters[i].id].public_key;
    const key = new NodeRSA(voterPbKey, 'public');
    key.setOptions({ encryptionScheme: 'pkcs1' });
    voteMsg = key.encrypt(voteMsg, 'base64', 'utf-8');
    voter.ballots.push(voteMsg);
    // console.log(`Encripted with voter ${i+1} public key\n`, voteMsg, '\n\n')
  }

  for (let i = voters.length - 1; i >= 0; i--) {
    let voterPbKey = keys['voter_keys'][voters[i].id].public_key;
    const key = new NodeRSA(voterPbKey, 'public');
    key.setOptions({ encryptionScheme: 'pkcs1' });

    let randomLine = generateRandomLine(10);
    voteMsg += randomLine;
    randomLines.push(randomLine);
    voteMsg = key.encrypt(voteMsg, 'base64', 'utf-8');
    voter.ballots.push(voteMsg);
  }
  console.log('Generated and encrypted ballot for voter:', voter.id);
  return voteMsg;
};

const decryptAndDeleteLines = async (voter) => {
  let voterPrKey = keys['voter_keys'][voter.id].private_key;
  const key = new NodeRSA(voterPrKey, 'private');
  key.setOptions({ encryptionScheme: 'pkcs1' });

  ballots.forEach((ballot, index) => {
    // console.log(ballot, '\n\n')
    let decrypted = key.decrypt(ballot, 'utf8');
    if (!decrypted) {
      console.log(`Voter ${voter.id} could not decrypt ballot ${index + 1}`);
      process.exit(1);
    }
    console.log(`Voter ${voter.id} decrypted ballot ${index + 1}`);
    randomLines.forEach((line, lineIndex) => {
      if (decrypted.includes(line)) {
        decrypted = decrypted.replace(line, '');
        console.log(
          `Voter ${voter.id} deleted random line in ballot ${index + 1}`
        );
      }
    });
    ballots[index] = decrypted;
  });

  let ballotExists = false;

  for (let el of voter.ballots) {
    if (ballots.includes(el)) {
      ballotExists = true;
    }
  }

  if (!ballotExists) {
    console.log("Voter didn't find his ballot.");
    process.exit(1);
  } else {
    console.log(`Voter ${voter.id} checked that his ballot is still there`);
  }

  ballots = shuffle(ballots);
  console.log(`Voter ${voter.id} shuffled ballots`);
  console.log('\n\n');
};

const decryptAndSign = async (voterIndex) => {
  let ballotsMsg;
  let voterPrKey = keys['voter_keys'][voters[voterIndex].id].private_key;
  const key = new NodeRSA(voterPrKey, 'private');
  key.setOptions({ encryptionScheme: 'pkcs1' });

  if (voterIndex > 0) {
    // check signature
    ballotsMsg = JSON.stringify(ballots);
    let { signature, p, g, y } = signatures[voters[voterIndex - 1].id];
    const verifySignature = elGamal.verify(p, g, y, ballotsMsg, signature);
    if (!verifySignature) {
      console.log(
        `Voter ${voters[voterIndex].id} could not verify signature of voter ${
          voters[voterIndex - 1].id
        }`
      );
      process.exit(1);
    }
    console.log(
      `Voter ${voters[voterIndex].id} succesfully verified signature of voter ${
        voters[voterIndex - 1].id
      }`
    );
  }

  ballots.forEach((ballot, index) => {
    // console.log(ballot, '\n\n')
    let decrypted = key.decrypt(ballot, 'utf8');
    if (!decrypted) {
      console.log(
        `Voter ${voters[voterIndex].id} could not decrypt ballot ${index + 1}`
      );
      process.exit(1);
    }
    console.log(`Voter ${voters[voterIndex].id} decrypted ballot ${index + 1}`);
    ballots[index] = decrypted;
  });

  let ballotExists = false;

  for (let el of voters[voterIndex].ballots) {
    if (ballots.includes(el)) {
      ballotExists = true;
    }
  }

  if (!ballotExists) {
    console.log("Voter didn't find his ballot.");
    process.exit(1);
  }
  console.log(
    `Voter ${voters[voterIndex].id} checked that his ballot is still there`
  );

  ballots = shuffle(ballots);
  console.log(`Voter ${voters[voterIndex].id} shuffled ballots`);

  let { p, g, x, y } = elGamal.generateKeys();
  ballotsMsg = JSON.stringify(ballots);

  const signature = elGamal.sign(p, g, x, ballotsMsg);

  signatures[voters[voterIndex].id] = {
    signature,
    p,
    g,
    y,
  };

  console.log(`Voter ${voters[voterIndex].id} signed ballots\n\n`);
};

const checkLastSignature = async () => {
  // check signature of last voter
  ballotsMsg = JSON.stringify(ballots);
  let lastVoter = voters[voters.length - 1];
  let { signature, p, g, y } = signatures[lastVoter.id];
  const verifySignature = elGamal.verify(p, g, y, ballotsMsg, signature);
  if (!verifySignature) {
    console.log(
      `Voters could not verify signature of last voter ${lastVoter.id}`
    );
    process.exit(1);
  }
  console.log(
    `Voters succesfully verified signature of voter ${lastVoter.id}\n`
  );
};

const checkVoterBallots = async () => {
  //all voters check if their ballot is there
  for (let voter of voters) {
    let ballotExists = false;

    for (let el of voter.ballots) {
      if (ballots.includes(el)) {
        ballotExists = true;
      }
    }
    if (!ballotExists) {
      console.log("Voter didn't find his ballot.");
      process.exit(1);
    }
    console.log(`Voter ${voter.id} checked that his ballot is still there`);
  }
  console.log('\n');
};

const calculateResults = async () => {
  let votersDone = new Set();

  candidates.forEach((el) => {
    results.candidates.push({ id: el.id, name: el.name, votes: 0 });
  });

  ballots.forEach((ballot, index) => {
    randomLines.forEach((line, lineIndex) => {
      if (ballot.includes(line)) {
        ballot = ballot.replace(line, '');
        console.log(`Random line was deleted in ballot ${index + 1}`);
      }
    });

    ballotObj = JSON.parse(ballot);
    // console.log(ballotObj)

    const candidateIndex = candidates.findIndex(
      (el) => el.id === ballotObj.vote_for
    );
    if (candidateIndex < 0) {
      console.log(
        'There is no candidate with that id, that was provided in ballot:',
        ballotObj,
        '\n'
      );
      return;
    }

    const voterIndex = voters.findIndex((el) => el.id === ballotObj.voter_id);
    if (voterIndex < 0) {
      console.log('There is no voter with such id in ballot:' , ballotObj);
      return;
    }

    if(!voters[voterIndex].can_vote){
      console.log('This voter does not have the right to vote' , ballotObj)
      return;
    }

    if(votersDone.has(ballotObj.voter_id)){
      console.log(`Voter with id ${ballotObj.voter_id} has already voted`)
      return;
    }

    votersDone.add(ballotObj.voter_id);
    results.candidates[candidateIndex].votes += 1;
    results.votes.push({voter_id: ballotObj.voter_id, vote_for: candidates[candidateIndex].name})
    console.log(`Voter with id ${ballotObj.voter_id} has successfully voted for ${candidates[candidateIndex].name}`)
  });
  console.log('\n\n')
};

const viewResults = () => {
  if (!results.candidates || !results.votes) {
    console.log("There're no available vote results yet");
    return;
  }
  let resultsStr = 'Results:\n';
  for (let candidate of results.candidates) {
    resultsStr += `Candidate ${candidate.name} : ${candidate.votes} votes\n`;
  }
  resultsStr += '\n';
  for (let vote of results.votes) {
    resultsStr += `Voter ${vote.voter_id} voted for ${vote.vote_for}\n`;
  }
  console.log(resultsStr);
};

const main = async () => {
  //import or generate keys
  keys = require('./data/keys.json');
  if (!keys['voter_keys']) {
    console.log('no keys, generating new ones');
    keys = await generateRSAKeys();
  }

  console.log('Voters number:', voters.length);

  ballots[0] = await generateAndEncryptBallot(voters[0], 1);
  ballots[1] = await generateAndEncryptBallot(voters[1], 1);
  ballots[2] = await generateAndEncryptBallot(voters[2], 2);
  ballots[3] = await generateAndEncryptBallot(voters[3], 1);
  console.log('\n\n');

  await decryptAndDeleteLines(voters[0]);
  await decryptAndDeleteLines(voters[1]);
  await decryptAndDeleteLines(voters[2]);
  await decryptAndDeleteLines(voters[3]);

  await decryptAndSign(0);
  await decryptAndSign(1);
  await decryptAndSign(2);
  await decryptAndSign(3);
  // console.log(ballots);

  await checkLastSignature();

  await checkVoterBallots();

  await calculateResults();

  viewResults();
};

(async () => {
  await main();
})();
