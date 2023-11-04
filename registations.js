const fs = require('fs');
const crypto = require('crypto');
const voters = require('./data/voters.json');
let registerVoters = require('./data/reg_voters.json'); //array
let regNumbers = require('./data/reg_numbers.json'); //array
let registrations = require('./data/registrations.json'); //array of objects


const sendRegNumbers = async () => {
  if (registerVoters.length < 1) {
    console.log('no new voters requested');
  } 
  for (let voter of registerVoters) {
    let voterIndex = voters.findIndex((el) => el.id === parseInt(voter));
    let registrationIndex = registrations.findIndex((el) => el.voter_id === parseInt(voter));

    if (!voters[voterIndex]) {
      console.log("There's no voter with that id: " + voter);
      continue;
    }
    if(!voters[voterIndex].can_vote){
        console.log('User cannot vote with id:' + voter)
        continue;
    }

    if(registrations[registrationIndex]){
        console.log('user already got registration number: ' +voter)
        continue;
    }

    const regNumber = crypto.randomInt(9999999999)

    registrations.push({
        voter_id: voter,
        reg_number: regNumber
    })

    regNumbers.push(regNumber)

    console.log(`Registration number for voter with id ${voter} was generated`)
  }
  fs.writeFileSync('./data/registrations.json', JSON.stringify(registrations, null, 2))
  fs.writeFileSync('./data/reg_numbers.json', JSON.stringify(regNumbers, null, 2))
};

(async () => {
  await sendRegNumbers();
})();
