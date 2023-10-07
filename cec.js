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

const cecKey = new NodeRSA(keys.cec_key.private_key, 'private');
cecKey.setOptions({ encryptionScheme: 'pkcs1' });

let results = {candidates: [], votes : []};

let votersDone = new Set();

candidates.forEach((el) => {
  results.candidates.push({ id: el.id, name: el.name, votes: 0 });
});

const calculateVotes = async () => {
  for (let vote of votesData) {
    let { hashedMessage, sign, key } = vote;

    const decriptedMsg = cecKey.decrypt(hashedMessage, 'utf8');
    // console.log({ decriptedMsg, sign });

    //decript using CEC PK
    const voterKey = new NodeRSA(key, 'private');
    voterKey.setOptions({ encryptionScheme: 'pkcs1' });

    //check signature
    const verify = cecKey.verify(decriptedMsg, sign, 'utf8', 'base64');
    if (!verify) {
      console.log('signature not confirmed');
      continue;
    }

    //decript using key the voter provided with ballot
    const message = voterKey.decrypt(decriptedMsg, 'utf8');
    // console.log(message)

    const voteData = JSON.parse(message);
    // console.log(voteData)

    if (!voteData.can_vote) {
      console.log('This voter is not allowed to vote');
      continue;
    }

    if(votersDone.has(voteData.id)){
      console.log('voter already voted');
      continue;
    }

    const candidateIndex = candidates.findIndex(el => el.id === voteData.vote_for)
    votersDone.add(voteData.id);
    results.candidates[candidateIndex].votes += 1;
    results.votes.push({voter_id: voteData.id, vote_for: candidates[candidateIndex].name})
  }
};

const signBallots = () => {
  if (!ballotsArr[0]) return false;
  for (let el of ballotsArr) {
    let ballotsValid = true;
    el.ballots = shuffle(el.ballots);
    if (signedBallots.voters.includes(el.voter_id)) {
      console.log('User already has signed ballot');
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
        const messageObj = JSON.parse(decripted);
        let voterIndex = voters.findIndex((el) => el.id === messageObj.id);
        if (
          voterIndex < 0 ||
          !voters[voterIndex].can_vote ||
          candidates.findIndex((el) => el.id === messageObj.vote_for) < 0
        ) {
          if (!voters[voterIndex].can_vote && ballotsValid) {
            console.log("user can't vote, not generating a signed ballot");
            ballotsValid = false;
            break;
          }
          // console.log('ballot is wrong')
          ballotsValid = false;
        }
      }
    }
    if (el.ballots.length === 1 && ballotsValid) {
      //9 ballots are valid
      console.log('9 ballots are valid');
      let ballotObj = { ...el.ballots[0] };
      ballotObj.messages = ballotObj.messages.map((el) => {
        const sign = cecKey.sign(el, 'base64', 'utf8');
        return { msg: el, sign };
      });
      // console.log(ballotObj)
      signedBallots[el.voter_id] = ballotObj;
      signedBallots.voters.push(el.voter_id);
      fs.writeFileSync(
        './data/signed_ballots.json',
        JSON.stringify(signedBallots, null, 2)
      );
      console.log('Successfully validated ballots and signed one');
    }
  }
};

(async () => {
  //calculate votes
  await calculateVotes();
  console.log(JSON.stringify(results, null, 2));
  fs.writeFileSync('./data/results.json', JSON.stringify(results, null, 2))

  //sign ballots
  // await signBallots();
})();
