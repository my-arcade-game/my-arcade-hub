// ==========================================
// MAIN.JS - 3-STEP HANDSHAKE MULTIPLAYER ROUTER
// ==========================================
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
  let pendingMatchConfig = null;

  const myRole = () => (Multiplayer.isHost ? 'host' : 'guest');

  function sendBroadcast(eventName, payload = {}) {
    if (isMultiplayerActive && Multiplayer.channel) {
      Multiplayer.channel.send({
        type: 'broadcast',
        event: eventName,
        payload: { ...payload, senderRole: myRole() }
      });
    }
  }

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

      if (Multiplayer.channel) {
        // 1. Menu Navigation Sync
        Multiplayer.channel.on('broadcast', { event: 'press_start_menu' }, (payload) => {
          if (payload.payload && payload.payload.senderRole === myRole()) return;
          openMenuScreen();
        });

        // 2. Character Selection Sync
        Multiplayer.channel.on('broadcast', { event: 'select_country' }, (payload) => {
          const { slot, countryId, senderRole } = payload.payload;
          if (senderRole === myRole()) return;

          const list = window.COUNTRIES || (typeof COUNTRIES !== 'undefined' ? COUNTRIES : []);
          const country = countryId ? list.find(c => c.id === countryId) : null;
          
          if (typeof MenuSystem !== 'undefined' && MenuSystem.setSelection) {
            MenuSystem.setSelection(slot, country, true);
          }
        });

        // 3. HANDSHAKE STEP 1 (GUEST RECEIVES PREPARE SIGNAL FROM HOST)
        Multiplayer.channel.on('broadcast', { event: 'match_prepare' }, (payload) => {
          const { p1Id, p2Id, seed, senderRole } = payload.payload;
          if (senderRole === myRole()) return;

          const list = window.COUNTRIES || (typeof COUNTRIES !== 'undefined' ? COUNTRIES : []);
          const p1 = list.find(c => c.id === p1Id);
          const p2 = list.find(c => c.id === p2Id);

          if (p1 && p2) {
            pendingMatchConfig = { p1, p2, seed };
            // STEP 2: GUEST CONFIRMS READY BACK TO HOST
            sendBroadcast('guest_ready', { seed });
          }
        });

        // 4. HANDSHAKE STEP 2 (HOST RECEIVES GUEST CONFIRMATION)
        Multiplayer.channel.on('broadcast', { event: 'guest_ready' }, (payload) => {
          const { senderRole } = payload.payload;
          if (senderRole === myRole()) return;

          if (Multiplayer.isHost && pendingMatchConfig) {
            // STEP 3: HOST SENDS FINAL START COMMAND TO BOTH
            sendBroadcast('match_start', { seed: pendingMatchConfig.seed });
            launchMatch(pendingMatchConfig.p1, pendingMatchConfig.p2, pendingMatchConfig.seed);
          }
        });

        // 5. HANDSHAKE STEP 3 (GUEST RECEIVES START SIGNAL AND LAUNCHES)
        Multiplayer.channel.on('broadcast', { event: 'match_start' }, (payload) => {
          const { senderRole } = payload.payload;
          if (senderRole === myRole()) return;

          if (pendingMatchConfig) {
            launchMatch(pendingMatchConfig.p1, pendingMatchConfig.p2, pendingMatchConfig.seed);
          }
        });

        // Rematch & Re-select Routers
        Multiplayer.channel.on('broadcast', { event: 'rematch_battle' }, (payload) => {
          const { seed, senderRole } = payload.payload;
          if (senderRole === myRole()) return;

          const selections = MenuSystem.getSelections();
          if (screenWinner) screenWinner.classList.add('hidden');
          launchMatch(selections.p1, selections.p2, seed);
        });

        Multiplayer.channel.on('broadcast', { event: 'select_again' }, (payload) => {
          if (payload.payload && payload.payload.senderRole === myRole()) return;
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
    sendBroadcast('select_country', { slot, countryId });
  };

  function setRandomBackground(seed = 12345) {
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

      try {
        if (window.AudioSystem && window.AudioSystem.playVoice) {
          window.AudioSystem.playVoice('choose_fighter', () => {
            bannerOverlay.classList.remove('show');
          });
        } else {
          setTimeout(() => bannerOverlay.classList.remove('show'), 1200);
        }
      } catch (e) {
        setTimeout(() => bannerOverlay.classList.remove('show'), 1200);
      }
    }
  }

  function handlePressStart() {
    if (currentScreenName !== 'start') return;
    try {
      if (window.AudioSystem && window.AudioSystem.play) window.AudioSystem.play('click');
    } catch (e) {}
    sendBroadcast('press_start_menu');
    openMenuScreen();
  }

  if (screenStart) {
    screenStart.addEventListener('click', handlePressStart);
    screenStart.addEventListener('pointerdown', handlePressStart);
  }
  document.addEventListener('click', (e) => {
    if (currentScreenName === 'start') handlePressStart(e);
  });
  window.addEventListener('keydown', handlePressStart);

  // LAUNCH MATCH EXECUTION ENGINE
  function launchMatch(p1, p2, matchSeed) {
    currentScreenName = 'battle';
    if (screenMenu) screenMenu.classList.add('hidden');
    if (screenWinner) screenWinner.classList.add('hidden');

    setRandomBackground(matchSeed);

    if (window.BattleSystem) {
      const replayData = BattleSystem.generateReplay(p1, p2, matchSeed);
      BattleSystem.startPlayback(replayData, p1, p2, (winner) => {
        showWinner(winner);
      });
    }
  }

  // START FIGHT BUTTON (HOST INITIATES HANDSHAKE)
  if (btnFight) {
    btnFight.addEventListener('click', () => {
      const selections = MenuSystem.getSelections();
      if (!selections.p1 || !selections.p2) return;

      try {
        if (window.AudioSystem) {
          if (typeof window.AudioSystem.stopCountrySound === 'function') window.AudioSystem.stopCountrySound();
          if (typeof window.AudioSystem.play === 'function') window.AudioSystem.play('click');
        }
      } catch (e) {}

      const matchSeed = Math.floor(Math.random() * 2147483647);

      if (isMultiplayerActive && Multiplayer.isHost) {
        pendingMatchConfig = { p1: selections.p1, p2: selections.p2, seed: matchSeed };
        // STEP 1: HOST SENDS PREPARE SIGNAL TO GUEST
        sendBroadcast('match_prepare', {
          p1Id: selections.p1.id,
          p2Id: selections.p2.id,
          seed: matchSeed
        });
      } else {
        // LOCAL PLAY
        launchMatch(selections.p1, selections.p2, matchSeed);
      }
    });
  }

  if (btnRematch) {
    btnRematch.addEventListener('click', () => {
      const selections = MenuSystem.getSelections();
      const matchSeed = Math.floor(Math.random() * 2147483647);

      if (isMultiplayerActive && Multiplayer.isHost) {
        sendBroadcast('rematch_battle', { seed: matchSeed });
      }

      launchMatch(selections.p1, selections.p2, matchSeed);
    });
  }

  if (btnSelect) {
    btnSelect.addEventListener('click', () => {
      sendBroadcast('select_again');

      currentScreenName = 'menu';
      if (screenWinner) screenWinner.classList.add('hidden');
      if (screenMenu) screenMenu.classList.remove('hidden');
      MenuSystem.init({ active: isMultiplayerActive, isHost: Multiplayer.isHost });

      try {
        if (window.AudioSystem && window.AudioSystem.playVoice) {
          window.AudioSystem.playVoice('choose_fighter', () => {
            if (bannerOverlay) bannerOverlay.classList.remove('show');
          });
        }
      } catch (e) {}
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

    try {
      if (window.AudioSystem && typeof window.AudioSystem.playCountrySound === 'function') {
        window.AudioSystem.playCountrySound(winner.config.id);
      }
    } catch (e) {}
  }
});