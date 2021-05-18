// server.js
// where your node app starts

// we've started you off with Express (https://expressjs.com/)
// but feel free to use whatever libraries or frameworks you'd like through `package.json`.
const express = require("express");
const app = express();
const Airtable = require('airtable')
const { check } = require('express-validator/check')


// make all the files in 'public' available
// https://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));
app.use(express.json())

Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: process.env.AIRTABLE_API_KEY
})
const base = require('airtable').base(process.env.AIRTABLE_BASE_NAME)
const table = base(process.env.AIRTABLE_TABLE_NAME)


// https://expressjs.com/en/starter/basic-routing.html
app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/index.html");
});

app.post('/form', [
  check('name').isAlpha().isLength({ min: 3, max: 100 }),
  check('email').isEmail()
], (req, res) => {
  const name = req.body.name
  const email = req.body.email
  const date = (new Date()).toISOString()
  
  table.create({
    "Name": name,
    "Email": email,
    "Date": date
  }, (err, record) => {
    if (err) {
      console.error(err)
      return
    }

    console.log(record.getId())
  })

  res.end()
})


// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
