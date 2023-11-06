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