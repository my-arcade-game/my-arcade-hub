// /countryball/js/main.js
import { Multiplayer } from '../../shared/multiplayer.js';

document.addEventListener('DOMContentLoaded', async () => {
  const screenStart = document.getElementById('screen-start');
  const screenMenu = document.getElementById('screen-menu');
  const screenWinner = document.getElementById('screen-winner');
  
  const bannerOverlay = document.getElementById('banner-overlay');
  const bannerText = document.getElementById('banner-text');

  const btnFight = document.getElementById('btn-fight');
  const btnRematch = document.getElementById('btn-rematch');
  const btnSelect = document.getElementById('btn-select');
  const modeBadge = document.getElementById('mode-badge');

  let currentScreenName = 'start';
  let isMultiplayerActive = false;

  // 1. DUAL-MODE INITIALIZATION
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get('room');

  if (roomCode) {
    try {
      await Multiplayer.init();
      isMultiplayerActive = true;

      if (modeBadge) {
        modeBadge.innerText = `ROOM: ${Multiplayer.roomCode} | ${Multiplayer.isHost ? 'P1 (HOST)' : 'P2 (GUEST)'}`;
        modeBadge.style.color = Multiplayer.isHost ? '#00f2fe' : '#ff0055';
      }

      if (typeof MenuSystem !== 'undefined') {
        MenuSystem.init({ active: true, isHost: Multiplayer.isHost });
      }

      // Setup Broadcast Listeners
      if (Multiplayer.channel) {
        Multiplayer.channel.on('broadcast', { event: 'press_start_menu' }, () => {
          openMenuScreen();
        });

        Multiplayer.channel.on('broadcast', { event: 'select_country' }, (payload) => {
          const { slot, countryId } = payload.payload;
          const list = window.COUNTRIES || (typeof COUNTRIES !== 'undefined' ? COUNTRIES : []);
          const country = countryId ? list.find(c => c.id === countryId) : null;
          if (typeof MenuSystem !== 'undefined' && MenuSystem.setSelection) {
            MenuSystem.setSelection(slot, country);
          }
        });

        // START BATTLE WITH SYNCHRONIZED SEED
        Multiplayer.channel.on('broadcast', { event: 'start_game_battle' }, (payload) => {
          const { p1Id, p2Id, seed } = payload.payload;
          const list = window.COUNTRIES || (typeof COUNTRIES !== 'undefined' ? COUNTRIES : []);
          const p1 = list.find(c => c.id === p1Id);
          const p2 = list.find(c => c.id === p2Id);

          if (p1 && p2) {
            currentScreenName = 'battle';
            if (screenMenu) screenMenu.classList.add('hidden');
            setRandomBackground(seed);
            if (window.BattleSystem) {
              BattleSystem.start(p1, p2, (winner) => {
                showWinner(winner);
              }, seed);
            }
          }
        });

        // REMATCH WITH NEW SYNCHRONIZED SEED
        Multiplayer.channel.on('broadcast', { event: 'rematch_battle' }, (payload) => {
          const { seed } = payload.payload;
          currentScreenName = 'battle';
          const selections = MenuSystem.getSelections();
          if (screenWinner) screenWinner.classList.add('hidden');
          if (window.BattleSystem) {
            setRandomBackground(seed);
            BattleSystem.start(selections.p1, selections.p2, (winner) => {
              showWinner(winner);
            }, seed);
          }
        });

        Multiplayer.channel.on('broadcast', { event: 'select_again' }, () => {
          currentScreenName = 'menu';
          if (screenWinner) screenWinner.classList.add('hidden');
          if (screenMenu) screenMenu.classList.remove('hidden');
          MenuSystem.init({ active: isMultiplayerActive, isHost: Multiplayer.isHost });
        });
      }
    } catch (err) {
      console.error("Multiplayer setup error:", err);
    }
  } else {
    if (modeBadge) {
      modeBadge.innerText = 'SOLO / LOCAL PLAY';
      modeBadge.style.color = '#05ffa1';
    }
    if (typeof MenuSystem !== 'undefined') {
      MenuSystem.init({ active: false, isHost: false });
    }
  }

  window.onLocalSelectionChange = (slot, countryId) => {
    if (isMultiplayerActive && Multiplayer.channel) {
      Multiplayer.channel.send({
        type: 'broadcast',
        event: 'select_country',
        payload: { slot, countryId }
      });
    }
  };

  function setRandomBackground(seed = Math.floor(Math.random() * 10000)) {
    const bgImages = [
      'america_leader_pixel_art.webp',
      'china_leader_pixel_art.webp',
      'russia_leader_pixel_art.webp'
    ];
    
    const bgElement = document.getElementById('ring-background');
    if (bgElement) {
      const idx = Math.abs(seed) % bgImages.length;
      bgElement.src = `assets/background/${bgImages[idx]}`;
    }
  }

  function openMenuScreen() {
    if (currentScreenName === 'menu' || currentScreenName === 'battle') return;
    currentScreenName = 'menu';

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

  function handlePressStart(e) {
    if (currentScreenName !== 'start') return;

    if (window.AudioSystem && window.AudioSystem.play) {
      window.AudioSystem.play('click');
    }

    if (isMultiplayerActive && Multiplayer.channel) {
      Multiplayer.channel.send({
        type: 'broadcast',
        event: 'press_start_menu',
        payload: {}
      });
    }

    openMenuScreen();
  }

  if (screenStart) {
    screenStart.addEventListener('click', handlePressStart);
    screenStart.addEventListener('pointerdown', handlePressStart);
  }
  document.addEventListener('click', (e) => {
    if (currentScreenName === 'start') {
      handlePressStart(e);
    }
  });
  window.addEventListener('keydown', handlePressStart);

  if (btnFight) {
    btnFight.addEventListener('click', () => {
      const selections = MenuSystem.getSelections();
      if (!selections.p1 || !selections.p2) return;

      if (window.AudioSystem) {
        if (typeof window.AudioSystem.stopCountrySound === 'function') window.AudioSystem.stopCountrySound();
        if (typeof window.AudioSystem.play === 'function') window.AudioSystem.play('click');
      }

      // GENERATE A SEED FOR DETERMINISTIC SIMULATION
      const matchSeed = Math.floor(Math.random() * 2147483647);

      if (isMultiplayerActive && Multiplayer.channel) {
        Multiplayer.channel.send({
          type: 'broadcast',
          event: 'start_game_battle',
          payload: { p1Id: selections.p1.id, p2Id: selections.p2.id, seed: matchSeed }
        });
      }

      currentScreenName = 'battle';
      if (screenMenu) screenMenu.classList.add('hidden');

      if (window.BattleSystem) {
        setRandomBackground(matchSeed);
        BattleSystem.start(selections.p1, selections.p2, (winner) => {
          showWinner(winner);
        }, matchSeed);
      }
    });
  }

  if (btnRematch) {
    btnRematch.addEventListener('click', () => {
      const matchSeed = Math.floor(Math.random() * 2147483647);

      if (isMultiplayerActive && Multiplayer.channel) {
        Multiplayer.channel.send({
          type: 'broadcast',
          event: 'rematch_battle',
          payload: { seed: matchSeed }
        });
      }

      currentScreenName = 'battle';
      const selections = MenuSystem.getSelections();
      if (screenWinner) screenWinner.classList.add('hidden');

      if (window.BattleSystem) {
        setRandomBackground(matchSeed);
        BattleSystem.start(selections.p1, selections.p2, (winner) => {
          showWinner(winner);
        }, matchSeed);
      }
    });
  }

  if (btnSelect) {
    btnSelect.addEventListener('click', () => {
      if (isMultiplayerActive && Multiplayer.channel) {
        Multiplayer.channel.send({
          type: 'broadcast',
          event: 'select_again',
          payload: {}
        });
      }

      currentScreenName = 'menu';
      if (screenWinner) screenWinner.classList.add('hidden');
      if (screenMenu) screenMenu.classList.remove('hidden');
      MenuSystem.init({ active: isMultiplayerActive, isHost: Multiplayer.isHost });
      if (window.AudioSystem && window.AudioSystem.playVoice) {
        window.AudioSystem.playVoice('choose_fighter', () => {
          if (bannerOverlay) bannerOverlay.classList.remove('show');
        });
      }
    });
  }

  function showWinner(winner) {
    currentScreenName = 'winner';
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