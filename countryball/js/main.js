// ==========================================
// MAIN.JS - FAIL-SAFE DIRECT MATCH ROUTER
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

  // FAIL-SAFE COUNTRY RESOLVER (PREVENTS GUEST NULL-POINTER STUCK)
  function getCountryById(id) {
    const list = window.COUNTRIES || (typeof COUNTRIES !== 'undefined' ? COUNTRIES : []);
    if (!list || list.length === 0) return null;
    if (!id) return list[0];
    const found = list.find(c => c.id === id || (c.id && String(c.id).toLowerCase() === String(id).toLowerCase()));
    return found || list[0];
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

          const country = getCountryById(countryId);
          if (typeof MenuSystem !== 'undefined' && MenuSystem.setSelection) {
            MenuSystem.setSelection(slot, country, true);
          }
        });

        // 3. START GAME BATTLE (DIRECT FAIL-SAFE TRIGGER)
        Multiplayer.channel.on('broadcast', { event: 'start_game_battle' }, (payload) => {
          const { p1Id, p2Id, seed, senderRole } = payload.payload;
          if (senderRole === myRole()) return;
          if (currentScreenName === 'battle') return; // Avoid duplicate triggers

          const p1 = getCountryById(p1Id);
          const p2 = getCountryById(p2Id);
          launchMatch(p1, p2, seed);
        });

        // 4. REMATCH BATTLE
        Multiplayer.channel.on('broadcast', { event: 'rematch_battle' }, (payload) => {
          const { seed, senderRole } = payload.payload;
          if (senderRole === myRole()) return;
          if (currentScreenName === 'battle') return;

          const selections = MenuSystem.getSelections();
          const p1 = selections.p1 || getCountryById(null);
          const p2 = selections.p2 || getCountryById(null);
          launchMatch(p1, p2, seed);
        });

        // 5. RE-SELECT MENU
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
      if (window.AudioSystem && window.AudioSystem.play) {
        window.AudioSystem.play('click');
      }
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

  // UNIFIED MATCH LAUNCHER
  function launchMatch(p1, p2, matchSeed) {
    currentScreenName = 'battle';
    if (screenStart) screenStart.classList.add('hidden');
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

  // START FIGHT BUTTON (HOST SENDS DUAL BROADCAST)
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
      const startPayload = {
        p1Id: selections.p1.id,
        p2Id: selections.p2.id,
        seed: matchSeed
      };

      if (isMultiplayerActive && Multiplayer.isHost) {
        // Send primary broadcast immediately
        sendBroadcast('start_game_battle', startPayload);
        // Send backup retry broadcast after 300ms to guarantee packet delivery
        setTimeout(() => sendBroadcast('start_game_battle', startPayload), 300);
      }

      launchMatch(selections.p1, selections.p2, matchSeed);
    });
  }

  // REMATCH BUTTON
  if (btnRematch) {
    btnRematch.addEventListener('click', () => {
      const selections = MenuSystem.getSelections();
      const matchSeed = Math.floor(Math.random() * 2147483647);
      const rematchPayload = { seed: matchSeed };

      if (isMultiplayerActive && Multiplayer.isHost) {
        sendBroadcast('rematch_battle', rematchPayload);
        setTimeout(() => sendBroadcast('rematch_battle', rematchPayload), 300);
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