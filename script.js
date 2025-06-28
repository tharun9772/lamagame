document.addEventListener('DOMContentLoaded', () => {
    const gameCards = document.querySelectorAll('.game-card');
    gameCards.forEach(card => {
        card.addEventListener('click', () => {
            const gamePath = card.dataset.game;
            if (gamePath) {
                window.location.href = gamePath;
            }
        });
    });

    // Check if user is signed in
    const userEmail = localStorage.getItem('userEmail');
    if (userEmail) {
        const nav = document.querySelector('nav');
        nav.innerHTML = `<span class="user-email">${userEmail}</span>`;
    }

    // Helper function to get accounts
    window.getAccounts = () => {
        const accounts = localStorage.getItem('accounts');
        return accounts ? JSON.parse(accounts) : {};
    };

    // Helper function to save accounts
    window.saveAccounts = (accounts) => {
        localStorage.setItem('accounts', JSON.stringify(accounts));
    };
});

function loadAdForGames() {
    const adContainer = document.getElementById('popup-inner');

    // Prevent double-loading
    if (window.afgLoaded) return;

    // Set up ad config
    window.afg = { u: 6532, s: 10 };

    // Create and inject the script
    const script = document.createElement('script');
    script.src = '//js.adforgames.com/cd.js';
    script.async = true;
    adContainer.appendChild(script);

    window.afgLoaded = true;
  }

  window.addEventListener('load', () => {
    const popup = document.getElementById('popup-ad');
    const closeBtn = document.getElementById('close-btn');

    // Show the popup
    popup.style.display = 'flex';

    // Load the ad inside the popup
    loadAdForGames();

    // Disable close button for 5 sec
    let seconds = 5;
    closeBtn.disabled = true;
    closeBtn.textContent = `Close (${seconds})`;
    closeBtn.style.cursor = 'not-allowed';
    closeBtn.style.background = '#ccc';

    const countdown = setInterval(() => {
      seconds--;
      closeBtn.textContent = `Close (${seconds})`;

      if (seconds <= 0) {
        clearInterval(countdown);
        closeBtn.textContent = 'Close';
        closeBtn.disabled = false;
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.background = '#f33';
        closeBtn.style.color = '#fff';
      }
    }, 1000);

    // Close popup on click
    closeBtn.addEventListener('click', () => {
      if (!closeBtn.disabled) {
        popup.style.display = 'none';
      }
    });
  });
