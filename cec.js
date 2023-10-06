const NodeRSA = require('node-rsa');
const fs = require('fs');
const { xorEncrypt, shuffle } = require('./utils');

const candidates = require('./data/candidates.json');
const voters = require('./data/voters.json');
const keys = require('./data/keys.json');
const ballotsArr = require('./data/ballots.json');
const ballotKeys = require('./data/ballot_keys.json');
let votesData = require('./data/votesdata.json');
let signedBallots = require('./data/signed_ballots.json');

const cecKey = new NodeRSA(keys.cec_key.private_key, 'private')

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

const signBallots = () => {
  if (!ballotsArr[0]) return false;
  for (let el of ballotsArr) {
    let ballotsValid = true;
    el.ballots = shuffle(el.ballots);
    if(signedBallots.voters.includes(el.voter_id)){
      console.log('User already has signed ballot')
      continue;
    }
    while (el.ballots.length > 1) {
      let messagesObj = el.ballots.pop();
      let private_key = ballotKeys[el.voter_id][messagesObj.ballot_id];
      const key = new NodeRSA(private_key, 'private');
      key.setOptions({ encryptionScheme: 'pkcs1' });
      if (!private_key || !el) break;

      for (let msg of messagesObj.messages) {
        const decripted = key.decrypt(msg, 'utf8');
        const messageObj = JSON.parse(decripted)
        let voterIndex = voters.findIndex(el => el.id === messageObj.id)
        if(voterIndex < 0 || !voters[voterIndex].can_vote || candidates.findIndex(el => el.id === messageObj.vote_for)< 0){
          // console.log('ballot is wrong')
          ballotsValid = false
        }
      }
    }
    if(el.ballots.length === 1 && ballotsValid){
      //9 ballots are valid
      console.log('9 ballots are valid')
      let ballotObj = {...el.ballots[0]}
      ballotObj.messages = ballotObj.messages.map(el => {
        const sign = cecKey.sign(el, 'utf8')
        return {msg: el, sign}
      })
      // console.log(ballotObj)
      signedBallots[el.voter_id] = ballotObj
      signedBallots.voters.push(el.voter_id)
      fs.writeFileSync('./data/signed_ballots.json', JSON.stringify(signedBallots, null, 2))
      console.log('Successfully validated ballots and signed one')
    }
  }
};

(async () => {
  //calculate votes

  // await calculateVotes();
  // console.log(JSON.stringify(results, null, 2));
  // fs.writeFileSync('./data/results.json', JSON.stringify(results, null, 2))

  //sign ballots
  await signBallots();
})();
