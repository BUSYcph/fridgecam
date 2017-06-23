'use strict'

require('dotenv').config();

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
  // when we're developing locally, we probably don't have a raspicam, so we'll just 
  // do a mock of it with a static image
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

    const storage = gcloud.storage({
        projectId: process.env.PROJECT_ID,
        keyFilename: process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH,
    });

    const bucket = storage.bucket(process.env.GOOGLE_STORAGE_BUCKET);

    let uploadedFileUrl = '';

    // until we know how to upload a buffer directly to google cloud, we'll just write it to disk
    // upload it, and then delete the temporary file afterwards.

    fs.writeFile('temp.jpg', photo, 'binary', (err) => {
      if(err) {
          console.log(err);
      } else {
          console.log("The file was saved!");
      }

      bucket.upload('temp.jpg', { destination : filename }).then((file) => {
        let uploadedFile = file[0];
        
        uploadedFileUrl = uploadedFile.metadata.mediaLink;

        const db = admin.database();
        const ref = db.ref('/');
        const snapsRef = ref.child('snaps');

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

app.listen(3000, () => {
  console.log('Example app listening on port 3000!');
});