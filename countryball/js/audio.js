// ==========================================
// AUDIO.JS - DEDICATED SOUND MANAGER
// ==========================================

const AudioSystem = (() => {
  let ctx = null;
  let activeSelectAudio = null;
  let activeWinnerAudio = null;

  const audioPool = {};

  const WEAPON_SOUND_MAP = {
    '🗡️': 'slice.mp3',
    '⚔️': 'slice.mp3',
    '🪓': 'slice.mp3',
    '🥖': 'slice.mp3',
    '🎋': 'slice.mp3',
    '🍕': 'slice.mp3',
    '💣': 'boom.mp3',
    '🚀': 'boom.mp3',
    '🐻': 'boom.mp3',
    '🦅': 'gun.mp3',
    '⚡': 'gun.mp3',
    '🎤': 'gun.mp3',
    '🍁': 'gun.mp3',
    '🥊': 'slice.mp3',
    '🐘': 'boom.mp3',
    '🌾': 'slice.mp3',
    '🏏': 'slice.mp3',
    '⚽': 'collide.mp3',
    '🍦': 'slice.mp3'
  };

  function getContext() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function unlock() {
    const audioCtx = getContext();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    try {
      const silentAudio = new Audio();
      silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      silentAudio.play().catch(() => {});
    } catch (e) {}
  }

  function playFile(filename) {
    try {
      unlock();
      // Create a fresh Audio instance per trigger for mobile compatibility
      const audio = new Audio(`assets/sounds/${filename}`);
      audio.volume = 0.85;
      audio.play().catch((err) => console.warn('Audio playback blocked:', err));
    } catch (e) {}
  }

  function stopCountrySound() {
    if (activeSelectAudio) {
      activeSelectAudio.pause();
      activeSelectAudio.currentTime = 0;
      activeSelectAudio = null;
    }
  }

  function playCountrySound(countryId) {
    stopCountrySound();
    try {
      unlock();
      activeSelectAudio = new Audio('assets/sounds/get_pick.mp3');
      activeSelectAudio.volume = 0.85;
      activeSelectAudio.play().catch(() => {});
    } catch (e) {}
  }

  function playPickSound() {
    playCountrySound();
  }

  function playWinnerSound() {
    stopCountrySound();

    if (activeWinnerAudio) {
      activeWinnerAudio.pause();
      activeWinnerAudio.currentTime = 0;
      activeWinnerAudio = null;
    }

    const winnerFile = Math.random() < 0.5 ? 'winner_1.mp3' : 'winner_2.mp3';
    try {
      unlock();
      activeWinnerAudio = new Audio(`assets/sounds/${winnerFile}`);
      activeWinnerAudio.volume = 0.95;
      activeWinnerAudio.play().catch(() => {});
    } catch (e) {}
  }

  function playVoice(type, callbacks = {}) {
    stopCountrySound();
    unlock();

    const onEnded = typeof callbacks === 'function' ? callbacks : callbacks.onEnded;
    const onHalfway = callbacks.onHalfway;

    const filename = type === 'choose_fighter' ? 'choose_fighter.mp3' : 'fight_start.mp3';

    try {
      const audio = new Audio(`assets/sounds/${filename}`);
      audio.volume = 0.85;
      let calledEnded = false;
      let calledHalfway = false;

      const finish = () => {
        if (!calledEnded) {
          calledEnded = true;
          if (onEnded) onEnded();
        }
      };

      const triggerHalfway = () => {
        if (!calledHalfway) {
          calledHalfway = true;
          if (onHalfway) onHalfway();
        }
      };

      let halfwayTimer = null;

      audio.addEventListener('play', () => {
        if (type === 'fight_start') {
          halfwayTimer = setTimeout(triggerHalfway, 850);
        }
      });

      audio.ontimeupdate = () => {
        if (audio.duration && audio.currentTime >= audio.duration * 0.45) {
          if (halfwayTimer) clearTimeout(halfwayTimer);
          triggerHalfway();
        }
      };

      audio.onended = finish;
      audio.onerror = finish;

      audio.play().catch(() => finish());

      setTimeout(finish, 3200);
    } catch (e) {
      if (onEnded) onEnded();
    }
  }

  function playUltiSound(callback) {
    try {
      unlock();
      const audio = new Audio('assets/sounds/ulti.mp3');
      audio.volume = 0.85;
      let called = false;

      const finish = () => {
        if (!called) {
          called = true;
          if (callback) callback();
        }
      };

      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(() => finish());

      setTimeout(finish, 3500);
    } catch (e) {
      if (callback) callback();
    }
  }

  function playWeaponSound(weaponEmoji) {
    if (weaponEmoji === '⚽') {
      play('bounce');
      return;
    }
    const soundFile = WEAPON_SOUND_MAP[weaponEmoji] || 'slice.mp3';
    playFile(soundFile);
  }

  function registerWeaponSound(weaponEmoji, soundFilename) {
    if (weaponEmoji && soundFilename) {
      WEAPON_SOUND_MAP[weaponEmoji] = soundFilename;
    }
  }

  function play(type) {
    const audioCtx = getContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;

    if (type === 'click') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } 
    else if (type === 'bounce') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    }
    else if (type === 'revive') {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'triangle';
        const noteStart = now + (idx * 0.07);

        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.25, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.16);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.16);
      });
    }
    else if (type === 'collide') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
    else if (type === 'explosion') {
      playFile('boom.mp3');
    }
    else if (type === 'ko') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);

      playWinnerSound();
    }
  }

  return { 
    unlock,
    play, 
    playFile, 
    playCountrySound, 
    playPickSound,
    playWinnerSound,
    stopCountrySound, 
    playVoice, 
    playWeaponSound, 
    playUltiSound,
    registerWeaponSound 
  };
})();

window.AudioSystem = AudioSystem;