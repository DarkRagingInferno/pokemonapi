const express = require('express');
const app = express();
const path = require('path');
const parser = require('body-parser');
const cors = require('cors');
const port = process.env.PORT || 4444;

const jwt = require('jsonwebtoken');
const db = require('./util/database');


// let fb = require('./util/firebase');



app.use(parser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => 
{
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, password, email, Authorization, pokeNo');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});


/*
 * This GET endpoint will take a users email and password and then call a stored 
 * procedure in the datase generate then stored procedure to check that the user exists.
 * If the user exists in the database a JWT is created with the email and password
 * and return to the client. 
 * If it does not exist we return No Such User
 * @param { email } a string 
 * @param { password } a string 
 * @return { JWT token } a JWT token for api authentication.
 */
app.get("/api/v1/login", (req, res) => 
{
    // let email = req.body.email;
    // let password = req.body.password;
    db.query("CALL authUser(?,?)", [req.headers.email, req.headers.password], function (err, result) {
        if(err){
            res.status(500).json({error: "Server Failure"});
        }
        else if(result[0][0] != null) {
            let user = JSON.parse(JSON.stringify(result));
            console.log(user[0][0]);
            res.status(200).json({token: 
                jwt.sign({
                    trainerId: user[0][0].trainerId,
                }, 'MYSECRETKEY')
            })
        } else {
            return res.status(401).json({message: 'No Such User'});
        }
    });
})
app.options("/*", (req, res) => 
{
    res.send(200);
})

/*
 * This POST endpoint will takes a users firstName, lastName, password, email, and
 * userName and call a stored procedure to create a new trainer in the database.
 * @param { firstName } a string 
 * @param { lastName } a string 
 * @param { password } a string 
 * @param { email } a string 
 * @param { userName } a string 
 * @return { message } a string message of success or failure.
 */
app.post("/api/v1/trainer/create", function(req, res) 
{
    let firstName = req.body.firstName;
    let lastName = req.body.lastName;
    let password = req.body.password;
    let email = req.body.email;
    let userName = req.body.userName;

    if(!stringValidation(firstName, lastName, password, userName)) return res.status(400).json({error: "Invalid Syntax"});
    if(!validateEmail(email)) return res.status(400).json({error: "Invalid Email"}); 
    

    db.query("CALL insertTrainer(?,?,?,?,?)", [firstName, lastName, password, email, userName], function (err, result) 
    {
        if(err)
        {
            res.status(500).json({error: "Server Failure"});
        }
        else if(result[0][0].message) 
        {
            console.log(result[0][0])
            db.query("CALL authUser(?,?)", [email, password], function (err, result) {
                if(err){
                    res.status(500).json({error: "Server Failure"});
                }
                else if(result[0][0] != null) {
                    let user = JSON.parse(JSON.stringify(result));
                    console.log(user[0][0]);
                    res.status(200).json({token: 
                        jwt.sign({
                            trainerId: user[0][0].trainerId,
                        }, 'MYSECRETKEY')
                    })
                } else {
                    return res.status(401).json({message: 'No Such User'});
                }
            });   
        } 
        else 
        {
            res.status(401).json({message: 'Trainer already exists'});
        }
    });
});

// middleware jwt token to see if user is legit
// any end point past this will not work if user is not auth
app.use((req, res, next) => {
    if(req.headers && req.headers.authorization && req.headers.authorization.split(' ')[0] == 'JWT'){
        jwt.verify(req.headers.authorization.split(' ')[1], 'MYSECRETKEY', (err, decode) => {
            if(err) {
                return res.status(401).json({message: "Unauthorized"});
            }
            else {
                req.user = decode;
                next();
            }   
        })
    } else {
        return res.status(401).json({message: "Unauthorized"});
    }
})


/*
 * This GET endpoint will takes a trainerId and call a stored procedure 
 * to return a trainer from the the database.
 * @param { trainerId } an Int
 * @return { JSON } a JSON object representing a trainer.
 */
app.get("/api/v1/trainer", (req, res) => 
{
    db.query("CALL getTrainer(?)", [req.user.trainerId], function (err, result) 
    {
        console.log(result)
        if(err)
        {
            res.status(500).json({error: "Server Failure"});
        }
        else if(result[0][0] != null) 
        {
            let trainer = JSON.parse(JSON.stringify(result));
             return res.status(200).json({trainer: trainer[0][0]});
        } 
        else 
        {
            res.status(401).json({message: 'No Such Trainer'});
        }
    });
});


/*
 * This GET endpoint will takes a trainerId and call a stored procedure 
 * to return a party from the the database.
 * @param { trainerId } an Int
 * @return { JSON } a JSON object reprsenting each pokemon in a party. 
 */
app.get("/api/v1/party", (req, res) => 
{
    db.query("CALL getParty(?)", [req.user.trainerId], function (err, result) {
        console.log(result)
        if(err){
            console.log(err)
            res.status(500).json({error: "Server Failure"});
        }
        else if(result[0][0] != null) {
            let party = JSON.parse(JSON.stringify(result));
            res.status(200).json(party[0])
        } else {
            res.status(401).json({message: 'Empty or No Such Party'});
        }
    });
});


/*
 * This GET endpoint will takes a trainerId and call a stored procedure 
 * to return a partyId from the the database.
 * @param { partyId } an Int
 * @return { JSON } a JSON object reprsenting each pokemon in a party. 
 */
app.get("/api/v1/party/id", (req, res) => 
{
    db.query("CALL getPartyId(?)", [req.user.trainerId], function (err, result) {
        console.log(result)
        if(err){
            res.status(500).json({error: "Server Failure"});
        }
        else if(result[0][0].party_partyId != null) {
            let party = JSON.parse(JSON.stringify(result));
            res.status(200).json(party[0][0])
        } else {
            res.status(401).json({message: 'No Such Party'});
        }
    });
});


/*
 * This GET endpoint will takes a trainerId and call a stored procedure 
 * to return a create a partyId and return partyId from the the database or 
 * just return a partyId
 * @param { trainerId } an Int
 * @return { partyId } an Int
 */
app.get("/api/v1/party/create", (req, res) => 
{
    db.query("CALL getPartyId(?)", [req.user.trainerId], function (err, result) {
        if(err){
            res.status(500).json({error: "Server Failure"});
        }
        else if(result[0][0].party_partyId != null) {
            console.log(result[0][0])
            res.status(401).json({message: 'Party Already Exists'});
        } else {
            db.query("CALL createParty(?)", [req.user.trainerId], function (err, result) {
                if(err){
                    res.status(500).json({error: "Server Failure"});
                }
                else if(result[0][0]!= null) {
                    res.status(200).json(result[0][0]);
                }
                else{
                    res.status(401).json({message: "Error creating party"});
                }
            });   
        }
    });
});


/*
 * This PUT endpoint takes a trainerId and a pokeNo and calls a stored procedure
 * to add a pokemon to the party.
 * 
 * @param { trainerId } an Int
 * @param { pokeNo } an Int
 * @return { messagea } a string 
 */
app.put("/api/v1/party/add", (req, res) => 
{
    let pokeNo = req.body.pokeNo;
    
    db.query("CALL addToParty(?, ?)", [req.user.trainerId, pokeNo], function (err, result) {
        if(err){
            console.log(err)
            res.status(401).json({message: "Pokemon Doesn't Exist"});
        }
        else if(result[0][0] != null) {
            db.query("CALL getParty(?)", [req.user.trainerId], function (err, result) {
                if(err){
                    res.status(500).json({error: "Server Failure"});
                }
                else if(result[0][0] != null) {
                    let party = JSON.parse(JSON.stringify(result));
                    if(party[0].length > 6){
                        res.status(401).json({message: 'Limit of 6 exceeded'})
                        return
                    } else{
                        res.status(200).json(party[0])
                        return 
                    }
                } else {
                    res.status(401).json({message: 'Failed to add Pokemon into the Party'});
                }
            });
        } else {
            res.status(401).json({message: 'No Party Exists'});
        }
    });
});


/*
 * This DELETE endpoint takes a trainerId and a pokeNo and calls a stored procedure
 * to delete a pokemon in the party.
 * 
 * @param { trainerId } an Int
 * @param { pokeNo } an Int
 * @return { string } a string 
 */
app.delete("/api/v1/party/delete", (req, res) => 
{
    let pokeNo = req.body.pokeNo;

    db.query("CALL deletePokemonFromParty(?, ?)", [req.user.trainerId, pokeNo], function (err, result) {
        if(err){
            res.status(500).json({error: "Server Failure"});
        }
        else if(result[0][0] != null) {
            db.query("CALL getParty(?)", [req.user.trainerId], function (err, result) {
                if(err){
                    res.status(500).json({error: "Server Failure"});
                }
                else if(result[0][0] != null) {
                    let party = JSON.parse(JSON.stringify(result));
                    res.status(200).json(party[0]);
                } else {
                    res.status(401).json({message: 'No Such Pokemon in Party'});
                }
            });
        } else {
            res.status(401).json({message: 'No Party Exists'});
        }
        
    });
});


/*
 * This GET endpoint takes a pokeNo and calls a stored procedure
 * to get a pokemon from the database.
 * 
 * @param { pokeNo } an Int
 * @return { JSON } a JSON object representing a pokemon. 
 */
app.get("/api/v1/pokemon", (req, res) => 
{   
    db.query("CALL getPokemon(?)", [req.headers.pokeno], function (err, result) 
    {
        console.log(result)
        if(err)
        {
            res.status(500).json({error: "Server Failure"});
        }
        else if(result[0][0] != null) 
        {
            let pokemon = JSON.parse(JSON.stringify(result));
             return res.status(200).json({pokemon: pokemon[0][0]});
        } 
        else 
        {
            res.status(401).json({message: 'No Such Pokemon'});
        }
    });
});


/*
 * This PUT endpoint takes a trainerId, firstName, lastName, email and calls 
 * a stored procedure to update a trainer's information in the database.
 * 
 * @param { trainerId } an Int
 * @param { firstName } an string
 * @param { lastName } an string
 * @param { email } an string
 * @return { message } a string
 */
app.put("/api/v1/trainer/update", function(req, res) 
{
    let firstName = req.body.firstName;
    let lastName = req.body.lastName;
    let email = req.body.email;

    db.query("CALL updateTrainer(?,?,?,?)", [req.user.trainerId, firstName, lastName, email], function (err, result) 
    {
        if(err)
        {
            console.log(err)
            res.status(500).json({error: "Server Failure"});
        }
        else if(result[0][0] != null) 
        {
            let trainer = JSON.parse(JSON.stringify(result));
            return res.status(200).json({trainer: trainer[0][0]});
        } 
        else 
        {
            res.status(401).json({message: 'This trainer did not Exist'});
        }
    });
});


/*
 * This DELETE endpoint takes a trainerId, password and calls 
 * a stored procedure to delete a trainer from the databased.
 * 
 * @param { trainerId } an Int
 * @param { password } an string
 * @return { message } a string
 */
app.delete("/api/v1/trainer/delete", (req, res) => 
{
    let password = req.body.password;
    db.query("CALL deleteTrainer(?,?)", [req.user.trainerId, password], function (err, result) {
        if(err){
            console.log(err);
            res.status(500).json({error: "Server Failure"});
        }
        else if(result[0][0] != null) {
            let deletedTrainer = JSON.parse(JSON.stringify(result));
            return res.status(200).json({deletedTrainer: deletedTrainer[0][0]});
        } else {
            res.status(401).json({message: 'Password Update Failed'});
        }
        
    });
});


/*
 * This POST endpoint takes parameters pokeNo, name, type1, type2, total, hp, attack,
 * defense, spec_atk, spec_def, speed, generation, legendary and calls a stored
 * procedure to create new pokemon in the database
 * 
 * @param { pokeNo } an Int
 * @param { name } a string
 * @param { type1 } a Int
 * @param { type2 } a string
 * @param { total } an Int
 * @param { hp } an Int
 * @param { attack } an Int
 * @param { defense } an Int
 * @param { spec_atk } an Int
 * @param { spec_def } an Int
 * @param { speed } an Int
 * @param { generation } an Int
 * @param { legendary } an Int
 * @return { message } a string
 */
app.post("/api/v1/pokemon/create", function(req, res) 
{
    let pokeNo = req.body.pokeNo;
    let name = req.body.name;
    let type1 = req.body.type1;
    let type2 = req.body.type2;
    let total = req.body.total;
    let hp = req.body.hp;
    let attack = req.body.attack;
    let defense = req.body.defense;
    let spec_atk = req.body.spec_atk;
    let spec_def = req.body.spec_def;
    let speed = req.body.speed;
    let generation = req.body.generation;
    let legendary = req.body.legendary;

    db.query("CALL insertPokemon(?,?,?,?,?,?,?,?,?,?,?,?,?)", [pokeNo, name ,type1 ,type2 ,total ,hp ,attack ,defense ,spec_atk ,spec_def ,speed ,generation ,legendary
    ], function (err, result) 
    {
        if(err)
        {
            console.log(err)
            res.status(401).json({error: "Duplicate Entry"});
        }
        else if(result[0][0] != null) 
        {
            console.log(result);
            let trainer = JSON.parse(JSON.stringify(result));
            return res.status(200).json({trainer: trainer[0][0]});
        } 
        else 
        {
            res.status(401).json({message: 'This pokemon does not Exist'});
        }
    });
});


/*
 * This PUT endpoint takes a pokeNO and calls a stored procedure to update
 * a pokemon from the databased.
 * 
 * @param { pokeNo } an Int
 * @return { message } a string
 */
app.put("/api/v1/pokemon/update", function(req, res) 
{
    let pokeNo = req.body.pokeNo;
    let name = req.body.name;
    let type1 = req.body.type1;
    let type2 = req.body.type2;
    let total = req.body.total;
    let hp = req.body.hp;
    let attack = req.body.attack;
    let defense = req.body.defense;
    let spec_atk = req.body.spec_atk;
    let spec_def = req.body.spec_def;
    let speed = req.body.speed;
    let generation = req.body.generation;
    let legendary = req.body.legendary;

    db.query("CALL getPokemon(?)", [req.body.pokeNo], function (err, result) 
    {
        if(err)
        {
            res.status(500).json({error: "Server Failure"});
        }
        else if(result[0][0] != null) 
        {
            console.log(result[0][0])
            db.query("CALL updatePokemon(?,?,?,?,?,?,?,?,?,?,?,?,?)", [pokeNo, name ,type1 ,type2 ,total ,hp ,attack ,defense ,spec_atk ,spec_def ,speed ,generation ,legendary
            ], function (err, result) 
            {
                if(err)
                {
                    console.log(err)
                    res.status(500).json({error: "Server Failure"});
                }
                else if(result[0] != null) 
                {
                    let trainer = JSON.parse(JSON.stringify(result));
                    return res.status(200).json({trainer: trainer[0][0]});
                } 
                else 
                {
                    res.status(401).json({message: 'This pokemon does not Exist'});
                }
            });
        } 
        else 
        {
            res.status(401).json({message: 'No Such Pokemon'});
        }
    });  
});


/*
 * This DELETE takes a pokeNo and calls  a stored procedure to delete a pokemon
 *  from the databased.
 * 
 * @param { pokeNo } an Int
 * @return { message } a string
 */
app.delete("/api/v1/pokemon/delete", (req, res) => 
{
    let pokeNo = req.body.pokeNo;

    db.query("CALL getPokemon(?)", [pokeNo], function (err, result) 
    {
        if(err)
        {
            res.status(500).json({error: "Server Failure"});
        }
        else if(result[0][0] != null) 
        {
            db.query("CALL deletePokemon(?)", [pokeNo], function (err, result) {
                if(err){
                    console.log(err);
                    res.status(500).json({error: "Server Failure"});
                }
                else if(result[0][0] != null) {
                    let deletedPokemon = JSON.parse(JSON.stringify(result));
                    return res.status(200).json({deletedPokemon: deletedPokemon[0][0]});
                } else {
                    res.status(401).json({message: 'No Such Pokemon Exists'});
                }  
            });
        } 
        else 
        {
            res.status(401).json({message: 'No Such Pokemon'});
        }
    });
});

/*
 * This POST endpoint takes a trainerId, image and calls 
 * a stored procedure to an image to a trainer.
 * 
 * @param { trainerId } an Int
 * @param { image } an image
 * @return { message } a string
 */
app.post("/api/v1/trainer/image", function(req, res) 
{
    let image = req.body.image;
    
    db.query("CALL addTrainerImage(?,?)", [req.user.trainerId, image], function (err, result) 
    {
        if(err)
        {
            res.status(500).json({error: "Server Failure"});
            console.log(err)
        }
        else if(result[0][0] != null) 
        {
            let image = JSON.parse(JSON.stringify(result));
            return res.status(200).json(image[0][0]);
        } 
        else 
        {
            res.status(401).json({message: 'Failed to upload image'});
        }
    });
});



const stringValidation = (fName, lName, password, username) => {
    let userInfo = [fName, lName, password, username]
    userInfo.forEach( e => {
        e.trim()
    })

    for(let i = 0; i < userInfo.length; i++)
    {
        if ( userInfo[0] == "") return false;
        else if( userInfo[1] == "") return false;
        else if ( userInfo[2] == "") return false;
        else if ( userInfo[3] == "") return false;
        else return true;
    }
}

const validateEmail = (email) => {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}


app.listen(port, () => {console.log(`Listening on port: ${port}`); })

