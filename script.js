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

window.addEventListener('load', () => {
    const popup = document.getElementById('popup-ad');
    const closeBtn = document.getElementById('close-btn');
    const adInner = document.getElementById('popup-inner');

    // Show popup
    popup.style.display = 'flex';

    // Load ad
    window.afg = { u: 6532, s: 10 };
    const script = document.createElement('script');
    script.src = '//js.adforgames.com/cd.js';
    adInner.appendChild(script);

    // Countdown timer for close button
    let seconds = 5;
    closeBtn.textContent = `Close (${seconds})`;

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

    // Close popup
    closeBtn.addEventListener('click', () => {
      if (!closeBtn.disabled) {
        popup.style.display = 'none';
      }
    });
  });
