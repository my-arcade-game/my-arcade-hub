document.addEventListener('DOMContentLoaded', () => {
  MenuSystem.init();

  const screenStart = document.getElementById('screen-start');
  const screenMenu = document.getElementById('screen-menu');
  const screenWinner = document.getElementById('screen-winner');
  
  const bannerOverlay = document.getElementById('banner-overlay');
  const bannerText = document.getElementById('banner-text');

  const btnFight = document.getElementById('btn-fight');
  const btnRematch = document.getElementById('btn-rematch');
  const btnSelect = document.getElementById('btn-select');

  let gameStarted = false;

  function setRandomBackground() {
    const bgImages = [
      'america_leader_pixel_art.webp',
      'china_leader_pixel_art.webp',
      'russia_leader_pixel_art.webp'
    ];
    
    const bgElement = document.getElementById('ring-background');
    if (bgElement) {
      const randomImg = bgImages[Math.floor(Math.random() * bgImages.length)];
      bgElement.src = `assets/background/${randomImg}`;
    }
  }

  function handlePressStart() {
    if (gameStarted) return;
    gameStarted = true;

    if (screenStart) screenStart.classList.add('hidden');
    if (screenMenu) screenMenu.classList.remove('hidden');

    if (bannerOverlay && bannerText) {
      bannerOverlay.classList.remove('show');
      void bannerOverlay.offsetWidth;

      bannerText.innerHTML = 'CHOOSE YOUR<br>FIGHTER!';
      bannerText.className = 'banner-choose';
      bannerOverlay.classList.add('show');

      if (window.AudioSystem && window.AudioSystem.playVoice) {
        window.AudioSystem.playVoice('choose_fighter', () => {
          bannerOverlay.classList.remove('show');
        });
      } else {
        setTimeout(() => {
          bannerOverlay.classList.remove('show');
        }, 1200);
      }
    }
  }

  if (screenStart) {
    screenStart.addEventListener('click', handlePressStart);
  }
  window.addEventListener('keydown', handlePressStart);

  if (btnFight) {
    btnFight.addEventListener('click', () => {
      const selections = MenuSystem.getSelections();
      if (!selections.p1 || !selections.p2) return;

      if (window.AudioSystem) {
        if (typeof window.AudioSystem.stopCountrySound === 'function') {
          window.AudioSystem.stopCountrySound();
        }
        if (typeof window.AudioSystem.play === 'function') {
          window.AudioSystem.play('click');
        }
      }

      if (screenMenu) screenMenu.classList.add('hidden');

      if (window.BattleSystem) {
        setRandomBackground();
        BattleSystem.start(selections.p1, selections.p2, (winner) => {
          showWinner(winner);
        });
      }
    });
  }

  if (btnRematch) {
    btnRematch.addEventListener('click', () => {
      const selections = MenuSystem.getSelections();
      if (screenWinner) screenWinner.classList.add('hidden');

      if (window.BattleSystem) {
        setRandomBackground();
        BattleSystem.start(selections.p1, selections.p2, (winner) => {
          showWinner(winner);
        });
      }
    });
  }

  if (btnSelect) {
    btnSelect.addEventListener('click', () => {
      if (screenWinner) screenWinner.classList.add('hidden');
      if (screenMenu) screenMenu.classList.remove('hidden');
      MenuSystem.init();
      if (window.AudioSystem && window.AudioSystem.playVoice) {
        window.AudioSystem.playVoice('choose_fighter', () => {
          if (bannerOverlay) bannerOverlay.classList.remove('show');
        });
      }
    });
  }

  function showWinner(winner) {
    const winnerFlagImg = document.getElementById('winner-flag-img');
    const winnerName = document.getElementById('winner-name');
    const winnerHp = document.getElementById('winner-hp');

    if (winnerFlagImg) {
      const imgSrc = winner.config.activeImgSrc || winner.config.flagImg;
      winnerFlagImg.src = encodeURI(imgSrc);
    }

    if (winnerName) {
      winnerName.textContent = `${winner.config.name} WINS!`;
    }

    if (winnerHp) {
      winnerHp.textContent = `REMAINING HP: ${Math.ceil(winner.hp)} / ${winner.maxHp}`;
    }

    if (screenWinner) screenWinner.classList.remove('hidden');

    if (window.AudioSystem && typeof window.AudioSystem.playCountrySound === 'function') {
      window.AudioSystem.playCountrySound(winner.config.id);
    }
  }
});