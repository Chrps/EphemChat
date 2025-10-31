(function() {
    document.addEventListener('DOMContentLoaded', () => {
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