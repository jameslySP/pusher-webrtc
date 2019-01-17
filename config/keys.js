// decide on heroku env variables or
// local dev keys for pusher
if (process.env.NODE_ENV === 'production') {
    module.exports = require('./prod');
}
else {
    module.exports = require('./dev');
}