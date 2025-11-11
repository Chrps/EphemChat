(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const isLoggedIn = sessionStorage.getItem('isLoggedIn');
        if (isLoggedIn === null) {
            window.location.href = 'login.html';
            return;
        }
        
        const currentUserSpan = document.getElementById('current-user');
        const username = sessionStorage.getItem('username');
        if (isLoggedIn === 'true' && username) {
            currentUserSpan.textContent = `Logged in as: ${username}`;
        } else {
            currentUserSpan.textContent = 'Guest User';
        }
        
        const logoutButton = document.getElementById('logout-button');
        logoutButton.addEventListener('click', () => {
            sessionStorage.clear();
            window.location.href = 'login.html';
        });
        
        const form = document.getElementById('room-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const roomName = document.getElementById('room-name').value.trim();
            const password = document.getElementById('password').value.trim();
            if (!roomName || !password) return;
            sessionStorage.setItem('roomName', roomName);
            sessionStorage.setItem('roomPassword', password);
            window.location.href = 'chat_room.html';
        });
    });
})();