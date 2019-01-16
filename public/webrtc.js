$(document).ready(function() {
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

    // render online users after successfully subscribing to
    // presence channel
    channel.bind("pusher:subscription_succeeded", members => {
        usersOnline = members.count;
        id = channel.members.me.id;
        $("#myid").html("My caller id is: " + id);
        members.forEach(member => {
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

    // add a call button for each user
    function render() {
        var list = "";
        users.forEach(user => {
            list += "<li>" + user +
                `<input type="button" style="float:right;" value="Call" onclick="callUser('` +
                user + `')" id="makeCall" /></li>`
        });
        $("#users").html(list);
    }

    // get calls for different browsers
    GetRTCPeerConnection();
    GetRTCSessionDescription();
    GetRTCIceCandidate();

    // prepare caller to use peer connection
    prepareCaller();

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
            if (window.URL) {
                $("#remoteview").src = window.URL.createObjectURL(evt.stream);
            } else {
                $("#remoteview").src = evt.stream;
            }
        };
    }
});