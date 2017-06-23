'use strict'

require('dotenv').config()

const gcloud = require('google-cloud');
const admin = require('firebase-admin');
const express = require('express');
const app = express();
const fs = require('fs');

let camera;

if (process.env.APP_DEBUG !== 'true') {
  const Raspistill = require('node-raspistill').Raspistill;
  camera = new Raspistill({
      verticalFlip: true,
      width: 800,
      height: 600
  });
}else{
  camera = {
    takePhoto : () => {
      return new Promise( (resolve, reject) => {
        fs.readFile('./photos/W17.jpg', (err, buffer) => {
          if (err) {
            reject(err);
          }else{
            resolve(buffer);
          }
        });
      });
    }
  }
}

const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

app.get('/snap', (req, res) => {
  camera.takePhoto().then((photo) => {
    let filename = 'fridge-shot-' + Date.now() + '.jpg';
    const db = admin.database();
    const ref = db.ref('/');

    const storage = gcloud.storage({
        projectId: 'fridgecam-d029f',
        keyFilename: './service-account-key.json',
    });

    const bucket = storage.bucket('fridgecam-d029f.appspot.com');

    const snapsRef = ref.child('snaps');

    // until we know how to upload a buffer directly to google cloud, we'll just write it to disk
    // and upload it afterwards.
    let uploadedFileUrl = '';

    fs.writeFile('temp.jpg', photo, 'binary', (err) => {
      if(err) {
          console.log(err);
      } else {
          console.log("The file was saved!");
      }

      bucket.upload('temp.jpg', { destination : filename }).then(function(file) {
        let uploadedFile = file[0];
        
        uploadedFileUrl = uploadedFile.metadata.mediaLink;

        snapsRef.push({
          snapper: 'Brian Frisch',
          time: Date.now(),
          image: uploadedFileUrl
        }).then(() => {
          res.status(200).send('<img src="'+uploadedFileUrl+'">');

          // let's delete our temporary file again now
          fs.unlink('temp.jpg',(err) => {
            if(err) return console.log(err);
            console.log('temporary file deleted successfully');
          });
        });
      }).catch((reason) => {
        console.log(reason);
      });

    })
  });
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