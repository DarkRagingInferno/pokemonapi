const mysql = require('mysql');

var con = mysql.createConnection({
  host: "pokemon-amar-john.cch1ufjdbsul.us-east-2.rds.amazonaws.com",
  user: "pokeadmin",
  password: "CH9FpqdcsVNPZgMa1rrD",
  database: "poke_schema"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

module.exports = con;