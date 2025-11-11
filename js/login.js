(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const loginForm = document.getElementById('login-form');
        const guestButton = document.getElementById('guest-button');
        
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('login-password').value.trim();
            
            if (!username || !password) return;
            
            sessionStorage.setItem('username', username);
            sessionStorage.setItem('isLoggedIn', 'true');
            
            window.location.href = 'index.html';
        });
        
        guestButton.addEventListener('click', () => {
            sessionStorage.setItem('isLoggedIn', 'false');
            sessionStorage.removeItem('username');
            
            window.location.href = 'index.html';
        });
    });
})();
