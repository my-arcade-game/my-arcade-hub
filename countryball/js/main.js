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

      // Initialize MenuSystem with exact multiplayer state
      if (typeof MenuSystem !== 'undefined') {
        MenuSystem.init({ active: true, isHost: Multiplayer.isHost });
      }

      // Setup Broadcast Listeners
      if (Multiplayer.channel) {
        // Broadcast: Start menu command received from connected player
        Multiplayer.channel.on('broadcast', { event: 'press_start_menu' }, () => {
          openMenuScreen();
        });

        // Broadcast: Selection updated
        Multiplayer.channel.on('broadcast', { event: 'select_country' }, (payload) => {
          const { slot, countryId } = payload.payload;
          const list = window.COUNTRIES || (typeof COUNTRIES !== 'undefined' ? COUNTRIES : []);
          const country = countryId ? list.find(c => c.id === countryId) : null;
          if (typeof MenuSystem !== 'undefined' && MenuSystem.setSelection) {
            MenuSystem.setSelection(slot, country);
          }
        });

        // Broadcast: Start fight (Passed Host status into BattleSystem)
        Multiplayer.channel.on('broadcast', { event: 'start_game_battle' }, (payload) => {
          const { p1Id, p2Id } = payload.payload;
          const list = window.COUNTRIES || (typeof COUNTRIES !== 'undefined' ? COUNTRIES : []);
          const p1 = list.find(c => c.id === p1Id);
          const p2 = list.find(c => c.id === p2Id);

          if (p1 && p2) {
            currentScreenName = 'battle';
            if (screenMenu) screenMenu.classList.add('hidden');
            setRandomBackground();
            if (window.BattleSystem) {
              BattleSystem.start(p1, p2, (winner) => {
                showWinner(winner);
              }, true, Multiplayer.isHost);
            }
          }
        });

        // Broadcast: Receive continuous Host physics snapshot (Guest synchronization)
        Multiplayer.channel.on('broadcast', { event: 'battle_sync' }, (payload) => {
          if (!Multiplayer.isHost && window.BattleSystem && window.BattleSystem.applyHostSync) {
            window.BattleSystem.applyHostSync(payload.payload);
          }
        });

        // Broadcast: Rematch
        Multiplayer.channel.on('broadcast', { event: 'rematch_battle' }, () => {
          currentScreenName = 'battle';
          const selections = MenuSystem.getSelections();
          if (screenWinner) screenWinner.classList.add('hidden');
          if (window.BattleSystem) {
            setRandomBackground();
            BattleSystem.start(selections.p1, selections.p2, (winner) => {
              showWinner(winner);
            }, true, Multiplayer.isHost);
          }
        });

        // Broadcast: Select again
        Multiplayer.channel.on('broadcast', { event: 'select_again' }, () => {
          currentScreenName = 'menu';
          if (screenWinner) screenWinner.classList.add('hidden');
          if (screenMenu) screenMenu.classList.remove('hidden');
          MenuSystem.init({ active: isMultiplayerActive, isHost: Multiplayer.isHost });
        });

        // Broadcast: State sync request
        Multiplayer.channel.on('broadcast', { event: 'request_game_state' }, () => {
          if (Multiplayer.isHost) {
            if (currentScreenName === 'menu') {
              Multiplayer.channel.send({
                type: 'broadcast',
                event: 'press_start_menu',
                payload: {}
              });
            }
            const selections = MenuSystem.getSelections();
            Multiplayer.channel.send({
              type: 'broadcast',
              event: 'game_state_sync',
              payload: {
                screen: currentScreenName,
                p1Id: selections.p1 ? selections.p1.id : null,
                p2Id: selections.p2 ? selections.p2.id : null
              }
            });
          }
        });

        // Broadcast: Game state sync response
        Multiplayer.channel.on('broadcast', { event: 'game_state_sync' }, (payload) => {
          const { screen, p1Id, p2Id } = payload.payload;
          const list = window.COUNTRIES || (typeof COUNTRIES !== 'undefined' ? COUNTRIES : []);

          if (screen === 'menu' && currentScreenName === 'start') {
            openMenuScreen();
          }

          if (typeof MenuSystem !== 'undefined') {
            if (p1Id) MenuSystem.setSelection('p1', list.find(c => c.id === p1Id));
            if (p2Id) MenuSystem.setSelection('p2', list.find(c => c.id === p2Id));
          }
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

  // Local selection trigger
  window.onLocalSelectionChange = (slot, countryId) => {
    if (isMultiplayerActive && Multiplayer.channel) {
      Multiplayer.channel.send({
        type: 'broadcast',
        event: 'select_country',
        payload: { slot, countryId }
      });
    }
  };

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

    if (isMultiplayerActive) {
      if (Multiplayer.channel) {
        Multiplayer.channel.send({
          type: 'broadcast',
          event: 'press_start_menu',
          payload: {}
        });
      }
    }

    openMenuScreen();
  }

  // GLOBAL TAP & CLICK LISTENERS
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
        if (typeof window.AudioSystem.stopCountrySound === 'function') {
          window.AudioSystem.stopCountrySound();
        }
        if (typeof window.AudioSystem.play === 'function') {
          window.AudioSystem.play('click');
        }
      }

      if (isMultiplayerActive && Multiplayer.channel) {
        Multiplayer.channel.send({
          type: 'broadcast',
          event: 'start_game_battle',
          payload: { p1Id: selections.p1.id, p2Id: selections.p2.id }
        });
      }

      currentScreenName = 'battle';
      if (screenMenu) screenMenu.classList.add('hidden');

      if (window.BattleSystem) {
        setRandomBackground();
        BattleSystem.start(selections.p1, selections.p2, (winner) => {
          showWinner(winner);
        }, isMultiplayerActive, Multiplayer.isHost);
      }
    });
  }

  if (btnRematch) {
    btnRematch.addEventListener('click', () => {
      if (isMultiplayerActive && Multiplayer.channel) {
        Multiplayer.channel.send({
          type: 'broadcast',
          event: 'rematch_battle',
          payload: {}
        });
      }

      currentScreenName = 'battle';
      const selections = MenuSystem.getSelections();
      if (screenWinner) screenWinner.classList.add('hidden');

      if (window.BattleSystem) {
        setRandomBackground();
        BattleSystem.start(selections.p1, selections.p2, (winner) => {
          showWinner(winner);
        }, isMultiplayerActive, Multiplayer.isHost);
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