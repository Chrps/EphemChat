(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const loginForm = document.getElementById('login-form');
        const guestButton = document.getElementById('guest-button');
        
        // Handle login form submission
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('login-password').value.trim();
            
            if (!username || !password) return;
            
            // Store user credentials in sessionStorage
            sessionStorage.setItem('username', username);
            sessionStorage.setItem('isLoggedIn', 'true');
            
            // Redirect to room selection page
            window.location.href = 'index.html';
        });
        
        // Handle guest button click
        guestButton.addEventListener('click', () => {
            // Mark as guest user
            sessionStorage.setItem('isLoggedIn', 'false');
            sessionStorage.removeItem('username');
            
            // Redirect to room selection page
            window.location.href = 'index.html';
        });
    });
})();
