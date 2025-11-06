
import { joinRoom as trysteroJoinRoom, defaultRelayUrls } from '../lib/trystero-torrent.min.js';
import { deriveKey, encryptMessage, decryptMessage, getSalt } from './crypto.js';

(function() {
    let room = null;
    let sendMessage = null;
    let onMessage = null;

    const messageInput = document.getElementById('msg');
    const sendButton = document.getElementById('send');
    const messageList = document.getElementById('messages');
    const peerList = document.getElementById('peers')
    const currentRoomSpan = document.getElementById('current-room');
    const homeButton = document.getElementById('home-button');

    function joinRoom(roomName, roomId, roomKey) {
        currentRoomSpan.textContent = roomName;
        room = trysteroJoinRoom({ appId: 'EphemChat', defaultRelayUrls }, roomId);
        room.onPeerJoin(() => updatePeerList(room.getPeers()));
        room.onPeerLeave(() => updatePeerList(room.getPeers()));
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

    function updatePeerList(peers) {
        peerList.innerHTML = '';
        Object.keys(peers).forEach(peerId => {
            const li = document.createElement('li');
            li.textContent = peerId;
            peerList.appendChild(li);
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
        addMessage(inputText);
        const encrypted = await encryptMessage(roomKey, inputText);
        console.log('Sending encrypted message:', encrypted);
        sendMessage(JSON.stringify(encrypted));
        messageInput.value = '';
        messageInput.focus();
    }

    async function getRoomId(roomName, password) {
        const enc = new TextEncoder();
        const normalized = password.normalize('NFKC');
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            enc.encode(normalized),
            { name: 'PBKDF2' },
            false,
            ['deriveBits']
        );

        const hashBuffer = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: enc.encode(roomName),
                iterations: 600000,
                hash: 'SHA-256'
            },
            keyMaterial,
            128
        );

        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return `${roomName}-${hashHex}`;
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
        const salt = await getSalt(roomName);
        const roomKey = await deriveKey(password, salt);
        const roomId = await getRoomId(roomName, password);
        password = null;
        console.log('Derived room ID:', roomId);
        joinRoom(roomName, roomId, roomKey);
        sendButton.addEventListener('click', () => send(roomKey));
        messageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { send(roomKey); } });
    })();

})();