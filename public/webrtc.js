var pusher = new Pusher("26bf35143b003081a07b", {
    cluster: "us2",
    encrypted: true,
    authEndpoint: "pusher/auth"
});

var usersOnline,    // count of users online
    id,             // id of current user
    users = [],     // details of all users
    sessionDesc,    // description of peer connection
    currentCaller,
    room,           // current people in a call
    caller,         // person calling/receiving a call
    localUserMedia; // audio/video stream beingg transmitted from caller

const channel = pusher.subscribe("presence-videocall");

// add a call button for each user
function render() {
    var list = "";
    users.forEach(user => {
        list += "<li>" + user +
            `<input type="button" value="Call" onclick="callUser('` +
            user + `')" id="makeCall" /></li>`
    });
    $("#users").html(list);
}

// Internet Connectivity Establishment (ICE)
// used to establish RTCPeerConnection
function GetRTCIceCandidate() {
    window.RTCIceCandidate =
        window.RTCIceCandidate ||
        window.webkitRTCIceCandidate ||
        window.mozRTCIceCandidate ||
        window.msRTCIceCandidate;

    return window.RTCIceCandidate;
}

// connection between local computer and remote computer
// provides methods to connect, maintain and monitor connection,
// and close connection
function GetRTCPeerConnection() {
    window.RTCPeerConnection =
        window.RTCPeerConnection ||
        window.webkitRTCPeerConnection ||
        window.mozRTCPeerConnection ||
        window.msRTCPeerConnection;

    return window.RTCPeerConnection;
}

// describes one end of the connection
// has a "type" for the offer/answer negotiation process
function GetRTCSessionDescription() {
    window.RTCSessionDescription =
        window.RTCSessionDescription ||
        window.webkitRTCSessionDescription ||
        window.mozRTCSessionDescription ||
        window.msRTCSessionDescription;

    return window.RTCSessionDescription;
}

// set up caller and add onicecandidate and onaddstream methods
function prepareCaller() {
    caller = new window.RTCPeerConnection();
    // listen for ICE candidates and send them to remote peers
    caller.onicecandidate = (evt) => {
        if (!evt.candidate) return;
        console.log("onicecandidate called");
        onIceCandidate(caller, evt);
    };
    // onaddstream handler to receive remote feed and show in remoteview video element
    caller.onaddstream = (evt) => {
        console.log("onaddstream called");
        document.getElementById("remoteview").srcObject = evt.stream;
    };
}

// send the ICE candidate to the remote peer
function onIceCandidate(peer, evt) {
    if (evt.candidate) {
        channel.trigger("client-candidate", {
            "candidate": evt.candidate,
            "room": room
        });
    }
}

// get local audio/video feed and show it in selfview video element
function getCam() {
    return navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    });
}

// create and send offer to remote peer on button click
function callUser(user) {
    getCam().then(stream => {
        document.getElementById("selfview").srcObject = stream;

        toggleEndCallButton();
        caller.addStream(stream);
        localUserMedia = stream;
        caller.createOffer().then(desc => {
            caller.setLocalDescription(new RTCSessionDescription(desc));
            channel.trigger("client-sdp", {
                sdp: desc,
                room: user,
                from: id
            });
            room = user;
        })
        .catch(error => console.log("an error occured", error + ", " + error.message));
    })
    .catch(error => console.log("an error occured", error + ", " + error.message));
}

function toggleEndCallButton() {
    if ($("#endCall").css("display") == "block") {
        $("#endCall").css("display", "none");
    } else {
        $("#endCall").css("display", "block");
    }
}

function endCall() {
    room = undefined;
    caller.close();
    for (let track of localUserMedia.getTracks()) {
        track.stop();
    }

    prepareCaller();
    toggleEndCallButton();
}

$(document).ready(function() {
    // render online users after successfully subscribing to
    // presence channel
    channel.bind("pusher:subscription_succeeded", members => {
        usersOnline = members.count;
        id = channel.members.me.id;
        $("#myid").html("My caller id is: " + id);
        members.each(member => {
            if (member.id != channel.members.me.id) {
                users.push(member.id);
            }
        });

        render();
    });

    // add user to array when they join the channel
    channel.bind("pusher:member_added", member => {
        users.push(member.id);
        render();
    });

    // remove member from array when they leave channel
    channel.bind("pusher:member_removed", member => {
        var index = users.indexOf(member.id);
        users.splice(index, 1);

        // end call if user in the room
        if (member.id == room) {
            endCall();
        }

        render();
    });

    // get calls for different browsers
    GetRTCPeerConnection();
    GetRTCSessionDescription();
    GetRTCIceCandidate();

    // prepare caller to use peer connection
    prepareCaller();

    channel.bind("client-candidate", msg => {
        if (msg.room == room) {
            console.log("candidate received");
            caller.addIceCandidate(new RTCIceCandidate(msg.candidate));
        }
    });

    channel.bind("client-sdp", msg => {
        if (msg.room == id) {
            var answer = confirm("You have a call from: " + msg.from + " Would you like to answer?");
            if (!answer) {
                return channel.trigger("client-reject", { "room": msg.room, "rejected": id });
            }
            room = msg.room;
            getCam().then(stream => {
                localUserMedia = stream;
                toggleEndCallButton();

                document.getElementById("selfview").srcObject = stream;

                caller.addStream(stream);
                var sessionDesc = new RTCSessionDescription(msg.sdp);
                caller.setRemoteDescription(sessionDesc);
                caller.createAnswer().then(sdp => {
                    caller.setLocalDescription(new RTCSessionDescription(sdp));
                    channel.trigger("client-answer", {
                        "sdp": sdp,
                        "room": room
                    });
                })
                .catch(error => console.log("an error occured", error + ", " + error.message));
            })
            .catch(error => console.log("an error has occured", error));
        }
    });

    channel.bind("client-answer", answer => {
        if (answer.room == room) {
            console.log("Answer received");
            caller.setRemoteDescription(new RTCSessionDescription(answer.sdp));
        }
    });

    channel.bind("client-reject", answer => {
        if (answer.room == room) {
            console.log("Call declined");
            alert("Call to " + answer.rejected + " was politely declined");
            endCall();
        }
    });
});