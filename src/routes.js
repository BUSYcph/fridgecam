const express = require('express');
const router = express.Router();
//const Raspistill = require('node-raspistill').Raspistill
//const camera = new Raspistill({
//    verticalFlip: true,
//    width: 800,
//    height: 600
//})

const firebaseMiddleware = require('express-firebase-middleware');

router.use((req, res, next) => {
    next()
});

router.use('/api', firebaseMiddleware.auth);
 
router.use((err, req, res, next) => {
    if (req.xhr) {
        res.status(500).send('Oops, Something went wrong!');
    } else {
        next(err);
    }
});

router.get('/api/snap', (req, res) => {
    res.status(200).send('yay');
    //camera.takePhoto().then((photo) => {
    //    console.log(photo)
    //})
});

router.get('/', (req, res) => {
    res.json({
        message: 'Home'
    });
});

router.get('/snap/hello', (req, res) => {
    res.json({
        message: `You're logged in as ${res.locals.user.email} with Firebase UID: ${res.locals.user.uid}`
    })
});

module.exports = router;