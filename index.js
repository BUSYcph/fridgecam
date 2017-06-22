'use strict'

require('dotenv').config()

const admin = require('firebase-admin');
const express = require('express');
const app = express();
const Raspistill = require('node-raspistill').Raspistill;
const camera = new Raspistill({
    verticalFlip: true,
    width: 800,
    height: 600
});

const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

app.get('/snap', (req, res) => {
  camera.takePhoto().then((photo) => {
    const db = admin.database();
    const ref = db.ref('/');
    
    const storage = admin.storage();
    const storageRef = storage.ref('/');

    const snapsRef = ref.child('snaps');

    storageRef.put(photo).then(function(snapshot) {
      snapsRef.push({
        snapper: "Brian Frisch",
        time: Date.now(),
        image: snapshot.downloadURL
      }).then(() => {
        res.status(200).send('<img src="'+photo+'">');
      });
    });
  })
});

app.use((err, req, res, next) => {
  if (req.xhr) {
    res.status(500).send('Oops, Something went wrong!');
  } else {
    next(err);
  }
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});