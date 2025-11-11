import { joinRoom as trysteroJoinRoom, defaultRelayUrls, selfId } from '../lib/trystero-torrent.min.js';
import { deriveKey, encryptMessage, decryptMessage, getSalt, getId } from './crypto.js';

(function() {
    let room = null;
    let sendMessage = null;
    let onMessage = null;
    const peerStreams = {};

    const messageInput = document.getElementById('msg');
    const sendButton = document.getElementById('send');
    const messageList = document.getElementById('messages');
    const peerList = document.getElementById('peers')
    const currentRoomSpan = document.getElementById('current-room');
    const userIdSpan = document.getElementById('user-id');
    const homeButton = document.getElementById('home-button');
    const videoContainer = document.getElementById('video-container');

    function addVideoStream(peerId, stream) {
        let wrapper = document.getElementById('video-wrapper-' + peerId);
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'video-wrapper-' + peerId;
            wrapper.className = 'video-wrapper';

            // Label above video
            const label = document.createElement('div');
            label.textContent = peerId === selfId ? 'You' : peerId;
            label.className = 'video-label';
            wrapper.appendChild(label);

            // Video element
            const video = document.createElement('video');
            video.id = 'video-' + peerId;
            video.className = 'video-stream';
            video.autoplay = true;
            video.playsInline = true;
            wrapper.appendChild(video);

            videoContainer.appendChild(wrapper);
        }
        // Always update srcObject
        const video = document.getElementById('video-' + peerId);
        if (video) video.srcObject = stream;
    }

    function removeVideoStream(peerId) {
        const wrapper = document.getElementById('video-wrapper-' + peerId);
        if (wrapper && videoContainer.contains(wrapper)) {
            videoContainer.removeChild(wrapper);
        }
    }

    async function joinRoom(roomName, roomId, roomKey) {
        const selfStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        currentRoomSpan.textContent = roomName;
        room = trysteroJoinRoom({ appId: 'EphemChat', defaultRelayUrls }, roomId);
        const localStream = selfStream.clone();
        localStream.getAudioTracks().forEach(track => localStream.removeTrack(track));
        addVideoStream(selfId, localStream);
        // Send own stream to all current peers
        Object.keys(room.getPeers()).forEach(peerId => {
            console.log('Sending selfStream to peer (initial):', peerId);
            room.addStream(selfStream, peerId);
        });

        userIdSpan.textContent = selfId;
        const pingIntervals = new Map();
        const peerLatencies = new Map();

        function updatePeerListWithLatency(peers) {
            peerList.innerHTML = '';
            Object.keys(peers).forEach(peerId => {
                const li = document.createElement('li');
                const latency = peerLatencies.has(peerId) ? ` (${peerLatencies.get(peerId)}ms)` : '';
                li.textContent = `${peerId}${latency}`;
                peerList.appendChild(li);
            });
        }

        async function pingAndUpdate(peerId) {
            try {
                console.log(room.selfId);
                const ms = await room.ping(peerId);
                peerLatencies.set(peerId, ms);
                updatePeerListWithLatency(room.getPeers());
                console.log(`ping to ${peerId}: took ${ms}ms`);
            } catch (e) {
                console.log(`ping error for ${peerId}:`, e);
            }
        }

        room.onPeerStream((stream, peerId) => {
            console.log('Received stream from', peerId, stream);
            addVideoStream(peerId, stream);
            peerStreams[peerId] = stream;
        });

        room.onPeerJoin(async peerId => {
            // Send own stream to the new peer
            console.log('Sending selfStream to new peer:', peerId);
            room.addStream(selfStream, peerId);
            // Optionally, resend to all current peers (redundant but safe)
            Object.keys(room.getPeers()).forEach(id => {
                if (id !== peerId) {
                    console.log('Resending selfStream to peer (onPeerJoin):', id);
                    room.addStream(selfStream, id);
                }
            });
            updatePeerListWithLatency(room.getPeers());
            await pingAndUpdate(peerId);
            const intervalId = setInterval(() => pingAndUpdate(peerId), 2000);
            pingIntervals.set(peerId, intervalId);
        });

        room.onPeerLeave(peerId => {
            room.removeStream(selfStream, peerId);
            removeVideoStream(peerId);
            delete peerStreams[peerId];
            updatePeerListWithLatency(room.getPeers());
            const intervalId = pingIntervals.get(peerId);
            if (intervalId) {
                clearInterval(intervalId);
                pingIntervals.delete(peerId);
            }
            peerLatencies.delete(peerId);
        });

        const peers = room.getPeers();
        console.log('peers: ', peers)
        Object.entries(peers).forEach(([id, conn]) => {
            console.log(id, conn);
        });
        [sendMessage, onMessage] = room.makeAction('data');

        onMessage(async (msg, peerId) => {
            try {
                console.log('Received encrypted message:', msg);
                const parsed = JSON.parse(msg);
                const decrypted = await decryptMessage(roomKey, parsed);
                addMessage(`[${peerId}] ${decrypted}`);
            } catch {
                addMessage(`[${peerId}] [decryption failed] ${msg}`);
            }
        });
    }

    function leaveRoom() {
        if (room) {
            room.leave();
            room = null;
        }
        sessionStorage.removeItem('roomName');
        window.location.href = 'index.html';
    }

    function formatTimestamp(d){
        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        const formatter = new Intl.DateTimeFormat(undefined, {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false,
            timeZone: userTimeZone
        });
        const parts = formatter.formatToParts(d).reduce((acc,p)=> { acc[p.type]=p.value; return acc; }, {});
        return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
    }

    function addMessage(text) {
        const messageItem = document.createElement('li');
        const messageText = document.createElement('div');
        messageText.textContent = text;
        const timestamp = document.createElement('div');
        timestamp.className = 'meta';
        timestamp.textContent = formatTimestamp(new Date());
        messageItem.appendChild(messageText);
        messageItem.appendChild(timestamp);
        messageList.appendChild(messageItem);
        messageList.scrollTop = messageList.scrollHeight;
    }

    async function send(roomKey){
        const inputText = messageInput.value.trim();
        if(!inputText) {
            alert('Please enter a message.');
            messageInput.focus();
            return;
        }
        const username = sessionStorage.getItem('username');
        const displayName = username || 'Guest';
        addMessage(`[You (${displayName})] ${inputText}`);
        const encrypted = await encryptMessage(roomKey, inputText);
        console.log('Sending encrypted message:', encrypted);
        sendMessage(JSON.stringify(encrypted));
        messageInput.value = '';
        messageInput.focus();
    }

    homeButton.addEventListener('click', leaveRoom);
    (async () => {
        let password = sessionStorage.getItem('roomPassword');
        sessionStorage.removeItem('roomPassword');
        const roomName = sessionStorage.getItem('roomName');
        if (!roomName || !password) {
            window.location.href = 'index.html';
            return;
        }
        let user_id = null;
        if (sessionStorage.getItem('isLoggedIn') === 'true') {
            user_id = sessionStorage.getItem('username');
        }
        const salt = await getSalt(roomName);
        const roomKey = await deriveKey(password, salt);
        const roomId = await getId(roomName, password);
        password = null;
        console.log('Derived room ID:', roomId);
        await joinRoom(roomName, roomId, roomKey);
        sendButton.addEventListener('click', () => send(roomKey));
        messageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { send(roomKey); } });
    })();

})();