$(document).ready(function() {
    var pusher = new Pusher("26bf35143b003081a07b", {
        cluster: "us2",
        encrypted: true,
        authEndpoint: "pusher/auth"
    });
});