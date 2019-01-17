const express = require('express');
const bodyParser = require('body-parser');
const Pusher = require('pusher');
const app = express();

const keys = require('./config/keys');

const port = process.env.PORT || 3000;

// parsing application/json
app.use(bodyParser.json());
// parsing application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// create an instance of Pusher
const pusher = new Pusher({
    appId: keys.appId,
    key: keys.key,
    secret: keys.secret,
    cluster: keys.secret,
    encrypted: true
});

// serve index.html file at root
app.get('/', (req, res) => {
    return res.sendFile(__dirname + '/public/index.html');
});

// public folder for multiple files
app.use(express.static(__dirname + '/public'));

app.listen(port, () => {
    return console.log('Server is up on port ' + port);
});

// authenitcation for presence channel
// generates random user id
// in real app, should use id from database or
// authentication method
app.post("/pusher/auth", (req, res) => {
    const socketId = req.body.socket_id;
    const channel = req.body.channel_name;
    var presenceData = {
        user_id: Math.random().toString(36).slice(2) + Date.now()
    };

    const auth = pusher.authenticate(socketId, channel, presenceData);
    res.send(auth);
});