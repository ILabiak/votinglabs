const fs = require('fs');
const NodeRSA = require('node-rsa');
const candidates = require('./data/candidates.json');
const voters = require('./data/voters.json');
const keys = require('./data/keys.json');
let ec1Results = require('./data/ec1_results.json');
let ec2Results = require('./data/ec2_results.json');
const { error } = require('console');

let results = { candidates: [], votes: [] };

let votersDone = new Set();

let cecPrivateKey = keys?.cec_key?.private_key;

const cecKey = new NodeRSA(cecPrivateKey, 'private');
cecKey.setOptions({ encryptionScheme: 'pkcs1' });

candidates.forEach((el) => {
  results.candidates.push({ id: el.id, name: el.name, votes: 0 });
});

const calculateVotes = async () => {
  for (let key of Object.keys(ec1Results)) {
    let decrypted1, decrypted2;
    let message1 = ec1Results[key]?.msg;
    let message2 = ec2Results[key]?.msg;

    if (message1.length < 1 || message2.length < 1) {
      console.log('Invalid messages, voter id:', key);
      continue;
    }
    // console.log(message1)

    try {
      decrypted1 = cecKey.decrypt(message1, 'utf8');
      decrypted2 = cecKey.decrypt(message2, 'utf8');
    } catch (err) {
      console.log('Error while verifying signatures');
      continue;
    }

    if(decrypted1.length < 1 || decrypted2.length < 1){
      console.log('Decripted messages are empty')
      continue;
    }

    let voteData1 = JSON.parse(decrypted1)
    let voteData2 = JSON.parse(decrypted2)

    let candidateId = voteData1?.vote_for_ec1 * voteData2?.vote_for_ec2



    let candidateIndex = candidates.findIndex((el) => el.id == candidateId)

    if(candidateIndex<0){
      console.log('Invalid candidate id')
      continue;
    }

    if(voteData1?.voter_id != key || voteData2?.voter_id != key){
      console.log('Info about voter from ballots and given id does not add up')
      continue;
    }


    if(votersDone.has(key)){
      console.log(`Person with id ${key} has already voted`)
      continue;
    }

    votersDone.add(key);
    results.candidates[candidateIndex].votes += 1;
    results.votes.push({voter_id: key, vote_for: candidates[candidateIndex].name})
    console.log(`Voter with id ${key} has successfully voted for ${candidates[candidateIndex].name}`)
  }
};

const viewResults = () => {
  if (!results.candidates || !results.votes) {
    console.log("There're no available vote results yet");
    return;
  }
  let resultsStr = '\n\nResults:\n';
  for (let candidate of results.candidates) {
    resultsStr += `Candidate ${candidate.name} : ${candidate.votes} votes\n`;
  }
  resultsStr += '\n\nEC1 ballots:\n'
  for(let key of Object.keys(ec1Results)){
    resultsStr += `ID ${key}: ${ec1Results[key]?.msg}\n`
  }
  resultsStr += '\n\nEC2 ballots:\n'
  for(let key of Object.keys(ec2Results)){
    resultsStr += `ID ${key}: ${ec2Results[key]?.msg}\n`
  }
  console.log(resultsStr);
};

(async () => {
  //calculate votes
  await calculateVotes();
  viewResults()
  // console.log(JSON.stringify(results, null, 2));
  // fs.writeFileSync('./data/results.json', JSON.stringify(results, null, 2))
})();
