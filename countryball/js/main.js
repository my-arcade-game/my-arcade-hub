// ==========================================
// MAIN.JS - MULTIPLAYER 2-WAY REMATCH HANDSHAKE
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
  let lastMatchFighters = { p1: null, p2: null };

  // REMATCH READY HANDSHAKE FLAGS
  let isHostRematchReady = false;
  let isGuestRematchReady = false;

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

  function getCountryById(id) {
    const list = window.COUNTRIES || (typeof COUNTRIES !== 'undefined' ? COUNTRIES : []);
    if (!list || list.length === 0) return null;
    if (!id) return list[0];
    const found = list.find(c => c.id === id || (c.id && String(c.id).toLowerCase() === String(id).toLowerCase()));
    return found || list[0];
  }

  function resetRematchState() {
    isHostRematchReady = false;
    isGuestRematchReady = false;
    if (btnRematch) {
      btnRematch.innerText = 'REMATCH';
      btnRematch.disabled = false;
      btnRematch.style.opacity = '1.0';
    }
  }

  function updateRematchUI() {
    if (!btnRematch) return;
    const amIReady = Multiplayer.isHost ? isHostRematchReady : isGuestRematchReady;
    const isOtherReady = Multiplayer.isHost ? isGuestRematchReady : isHostRematchReady;

    if (amIReady && !isOtherReady) {
      btnRematch.innerText = 'WAITING FOR OPPONENT... (1/2)';
      btnRematch.disabled = true;
      btnRematch.style.opacity = '0.7';
    } else if (!amIReady && isOtherReady) {
      btnRematch.innerText = 'OPPONENT READY! CLICK TO REMATCH';
      btnRematch.disabled = false;
      btnRematch.style.opacity = '1.0';
    }
  }

  function checkAndStartRematch() {
    if (isHostRematchReady && isGuestRematchReady && Multiplayer.isHost) {
      let p1 = lastMatchFighters.p1;
      let p2 = lastMatchFighters.p2;

      if (!p1 || !p2) {
        const selections = MenuSystem.getSelections();
        p1 = selections.p1 || getCountryById(null);
        p2 = selections.p2 || getCountryById(null);
      }

      const matchSeed = Math.floor(Math.random() * 2147483647);
      const rematchPayload = {
        p1Id: p1.id,
        p2Id: p2.id,
        seed: matchSeed
      };

      sendBroadcast('rematch_battle', rematchPayload);
      setTimeout(() => sendBroadcast('rematch_battle', rematchPayload), 300);

      resetRematchState();
      launchMatch(p1, p2, matchSeed);
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
        Multiplayer.channel.on('broadcast', { event: 'press_start_menu' }, (payload) => {
          if (payload.payload && payload.payload.senderRole === myRole()) return;
          openMenuScreen();
        });

        Multiplayer.channel.on('broadcast', { event: 'select_country' }, (payload) => {
          const { slot, countryId, senderRole } = payload.payload;
          if (senderRole === myRole()) return;

          const country = getCountryById(countryId);
          if (typeof MenuSystem !== 'undefined' && MenuSystem.setSelection) {
            MenuSystem.setSelection(slot, country, true);
          }
        });

        Multiplayer.channel.on('broadcast', { event: 'start_game_battle' }, (payload) => {
          const { p1Id, p2Id, seed, senderRole } = payload.payload;
          if (senderRole === myRole()) return;

          const p1 = getCountryById(p1Id);
          const p2 = getCountryById(p2Id);
          resetRematchState();
          launchMatch(p1, p2, seed);
        });

        // 1. LISTEN FOR PLAYER READY REMATCH SIGNAL
        Multiplayer.channel.on('broadcast', { event: 'player_rematch_ready' }, (payload) => {
          const { senderRole } = payload.payload;
          if (senderRole === myRole()) return;

          if (senderRole === 'host') isHostRematchReady = true;
          if (senderRole === 'guest') isGuestRematchReady = true;

          updateRematchUI();
          checkAndStartRematch();
        });

        // 2. LISTEN FOR BOTH READY REMATCH START COMMAND
        Multiplayer.channel.on('broadcast', { event: 'rematch_battle' }, (payload) => {
          const { p1Id, p2Id, seed, senderRole } = payload.payload;
          if (senderRole === myRole()) return;

          const p1 = getCountryById(p1Id) || lastMatchFighters.p1;
          const p2 = getCountryById(p2Id) || lastMatchFighters.p2;

          resetRematchState();
          launchMatch(p1, p2, seed);
        });

        Multiplayer.channel.on('broadcast', { event: 'select_again' }, (payload) => {
          if (payload.payload && payload.payload.senderRole === myRole()) return;
          resetRematchState();
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

  function launchMatch(p1, p2, matchSeed) {
    lastMatchFighters = { p1, p2 };
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
        sendBroadcast('start_game_battle', startPayload);
        setTimeout(() => sendBroadcast('start_game_battle', startPayload), 300);
      }

      resetRematchState();
      launchMatch(selections.p1, selections.p2, matchSeed);
    });
  }

  // REMATCH BUTTON CLICK LOGIC (2-WAY READY CHECK)
  if (btnRematch) {
    btnRematch.addEventListener('click', () => {
      try {
        if (window.AudioSystem && typeof window.AudioSystem.play === 'function') {
          window.AudioSystem.play('click');
        }
      } catch (e) {}

      if (isMultiplayerActive) {
        if (Multiplayer.isHost) {
          isHostRematchReady = true;
        } else {
          isGuestRematchReady = true;
        }

        updateRematchUI();
        sendBroadcast('player_rematch_ready');
        checkAndStartRematch();
      } else {
        // LOCAL PLAY
        let p1 = lastMatchFighters.p1;
        let p2 = lastMatchFighters.p2;

        if (!p1 || !p2) {
          const selections = MenuSystem.getSelections();
          p1 = selections.p1 || getCountryById(null);
          p2 = selections.p2 || getCountryById(null);
        }

        const matchSeed = Math.floor(Math.random() * 2147483647);
        launchMatch(p1, p2, matchSeed);
      }
    });
  }

  if (btnSelect) {
    btnSelect.addEventListener('click', () => {
      sendBroadcast('select_again');
      resetRematchState();

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
    resetRematchState();

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