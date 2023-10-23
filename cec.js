const fs = require('fs');

const candidates = require('./data/candidates.json');
const voters = require('./data/voters.json');
const { decrypt } = require('./elgamal');
const { verifyDsaSignature} = require('./dsa')
const keys = require('./data/keys.json');
let votesData = require('./data/votesdata.json');
let regNumbers = require('./data/reg_numbers.json'); //array

let results = {candidates: [], votes : []};

let votersDone = new Set();

candidates.forEach((el) => {
  results.candidates.push({ id: el.id, name: el.name, votes: 0 });
});

const calculateVotes = async () => {
  for (let vote of votesData) {
    vote.q = BigInt(vote.q)
    vote.p = BigInt(vote.p)
    vote.key = BigInt(vote.key)
    vote.hashedMessage = vote.hashedMessage.map(el => BigInt(el))

    //decrypt message
    const decryptedMsg = decrypt(vote.hashedMessage,vote.p, vote.key, vote.q)
    // console.dir(decryptedMsg)

    if(!decryptedMsg){
      console.log('Cannot decrypt message')
      continue;
    }

    //check signature
    const signature = Buffer.from(vote.signature.data);

    const verifySignature = verifyDsaSignature(decryptedMsg, signature, vote.verifySinature)

    if(!verifySignature){
      console.log('Signature not verified')
      continue;
    }

    const voteData = JSON.parse(decryptedMsg)

    if(!regNumbers.includes(voteData.reg_number)){
      console.log(`user with registration number ${voteData.reg_number} is not in database`)
      continue;
    }
    // console.log(voteData)

    const candidateIndex = candidates.findIndex(el => el.id === voteData.vote_for)
    votersDone.add(voteData.id);
    results.candidates[candidateIndex].votes += 1;
    results.votes.push({voter_id: voteData.voter_id, vote_for: candidates[candidateIndex].name})

    console.log(results)

    // console.log(vote.hashedMessage)
  }
};


(async () => {
  //calculate votes
  await calculateVotes();
  console.log(JSON.stringify(results, null, 2));
  fs.writeFileSync('./data/results.json', JSON.stringify(results, null, 2))

})();
