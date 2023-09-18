const NodeRSA = require('node-rsa');
const { xorEncrypt } = require('./utils');

const candidates = require('./data/candidates.json');
const voters = require('./data/voters.json');
const keys = require('./data/keys.json');
let votesData = require('./data/votesdata.json');

let results = [];

let votersDone = new Set();

candidates.forEach((el) => {
  results.push({ id: el.id, name: el.name, votes: 0 });
});

const calculateVotes = async () => {
  for (let vote of votesData) {
    let { hashedMessage, signature } = vote;
    // console.log({ hashedMessage, signature });

    message = await xorEncrypt(hashedMessage, keys.cec_key.public_key);

    console.log('message ', message);

    voteData = JSON.parse(message);

    const voterIndex = voters.findIndex((el) => el.id === voteData.id);

    if (voterIndex < 0) {
      console.log('no such voter');
      continue;
    }

    if (!voters[voterIndex].can_vote) {
      console.log('This voter is not allowed to vote');
      continue;
    }

    const voter_pb_key = keys.voter_keys[voteData.id].public_key;

    const key = new NodeRSA(voter_pb_key, 'public');

    const verifySignature = key.verify(
      hashedMessage,
      signature,
      undefined,
      'hex'
    );

    console.log('signature verified: ', verifySignature);

    if (verifySignature) {
      candidateIndex = results.findIndex((el) => el.id === voteData.vote_for);
      if (candidateIndex < 0) {
        console.log('No candidate with such id');
        continue;
      }
      if (votersDone.has(voteData.id)) {
        console.log('voter already voted');
      } else {
        results[candidateIndex].votes += 1;
        votersDone.add(voteData.id);
      }
    }
  }
};

(async () => {
  await calculateVotes();

  //show results
  console.log(JSON.stringify(results, null, 2));
})();
