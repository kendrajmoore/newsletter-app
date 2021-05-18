// server.js
// where your node app starts

// we've started you off with Express (https://expressjs.com/)
// but feel free to use whatever libraries or frameworks you'd like through `package.json`.
const express = require("express");
const app = express();
const Airtable = require('airtable')
const { check } = require('express-validator/check')
const fs = require('fs')
const { createJWT, verifyJWT } = require('./auth')
const cookieParser = require('cookie-parser')
const ta = require('time-ago')


// make all the files in 'public' available
// https://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));
app.use(express.json())
app.use(cookieParser())

Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: process.env.AIRTABLE_API_KEY
})
const base = require('airtable').base(process.env.AIRTABLE_BASE_NAME)
const table = base(process.env.AIRTABLE_TABLE_NAME)
const initializedFile = './.data/initialized'

app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/index.html");
});

app.get('/admin', (req, res) => {
  if(fs.existsSync(initializedFile)){
    verifyJWT(req.cookies.token).then(decodedToken => {
      res.sendFile(__dirname + '/views/admin.html')
    }).catch(err => {
      res.status(400).json({message: "Invalid auth token provided."})
    })
    
  } else {
    const token = createJWT({
      maxAge: 60 * 24 * 365
    })
    
    fs.closeSync(fs.openSync('./.data/initialized', 'w'))

    res.cookie('token', token, { httpOnly: true, secure: true })
    res.sendFile(__dirname + '/views/admin.html')
  }
})

app.get('/admin/reset', (req, res) => {
  try {
    if (fs.existsSync(initializedFile)) {
      verifyJWT(req.cookies.token).then(decodedToken => {
        fs.unlink(initializedFile, err => {
          if (err) {
            console.error('Error removing the file')
            res.status(500).end()
            return
          }
          res.send('Session ended')
        })
      }).catch(err => {
        res.status(400).json({message: "Invalid auth token provided."})
      })

    } else {
      res.status(500).json({message: "No session started."})
    }
  } catch(err) {
    console.error(err)
  }
})

let records = []
const getAirtableRecords = () => {
  return new Promise((resolve, reject) => {
    //return cached results if called multiple times
    if (records.length > 0) {
      resolve(records)
    }

    // called for every page of records
    const processPage = (partialRecords, fetchNextPage) => {
      records = [...records, ...partialRecords]
      fetchNextPage()
    }

    // called when all the records have been retrieved
    const processRecords = err => {
      if (err) {
        console.error(err)
        return
      }

      resolve(records)
    }

    table 
      .select({
        view: process.env.AIRTABLE_VIEW_NAME
      })
      .eachPage(processPage, processRecords)
  })
}

const getEmails = async () => {
  records = []
  const emails = await getAirtableRecords()
  return emails.map(record => {
    return {
      'email': record.get('Email'), 
      'name': record.get('Name'), 
      'date': ta.ago(record.get('Date'))
    }
  })
}

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
