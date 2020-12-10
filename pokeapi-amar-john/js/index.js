
const getStartedOnClick = (username, password) => 
{

}

const authfetch = (username, password) => 
{
    let user = fetch("https://memory-game-jvbp.herokuapp.com/get-scores", 
        {
            method: 'POST',
            headers: 
            {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(
            {
                "username": name,
                "score": userScore.toString()
            })
        })
        .then(response => response.json())
        .then(data => 
        {
            createLeaderboardScreen(data, name, userScore);
        })
        .catch((error) => 
        {
            console.error('Error:', error)
        });
    console.log(answer);
    return user;
}