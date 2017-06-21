const express = require('express')
const app = express()
const Raspistill = require('node-raspistill').Raspistill
const camera = new Raspistill({
    verticalFlip: true,
    width: 800,
    height: 600
})

app.get('/snap', (req, res) => {
  camera.takePhoto().then((photo) => {
    console.log(photo)
  })
})

app.get('*', (req, res) => {
    res.status(404).send('Unrecognised API call')
})

app.use((err, req, res, next) => {
  if (req.xhr) {
    res.status(500).send('Oops, Something went wrong!')
  } else {
    next(err)
  }
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})