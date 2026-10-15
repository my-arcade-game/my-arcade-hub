// ==========================================
// AUDIO.JS - DEDICATED SOUND MANAGER (MOBILE FIX)
// ==========================================

const AudioSystem = (() => {
  let ctx = null;
  let isUnlocked = false;

  // Active playing sources for controllable sounds
  let activeSelectSource = null;
  let activeWinnerSource = null;

  // Memory cache for decoded audio buffers
  const bufferCache = {};

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

  /**
   * Lazily initializes and returns the primary AudioContext
   */
  function getContext() {
    if (!ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        ctx = new AudioContextClass();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  /**
   * Global unlock trigger for iOS Safari and Android WebViews
   */
  function unlock() {
    const audioCtx = getContext();
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        isUnlocked = true;
      }).catch(() => {});
    } else {
      isUnlocked = true;
    }
  }

  // Bind one-time listeners to auto-unlock audio on first screen touch/tap
  const unlockEvents = ['pointerdown', 'touchstart', 'click', 'keydown'];
  const handleAutoUnlock = () => {
    unlock();
    if (isUnlocked) {
      unlockEvents.forEach(evt => window.removeEventListener(evt, handleAutoUnlock, true));
    }
  };
  unlockEvents.forEach(evt => window.addEventListener(evt, handleAutoUnlock, true));

  /**
   * Fetches and decodes sound files into Web Audio API buffers
   */
  async function loadBuffer(filename) {
    if (bufferCache[filename]) {
      return bufferCache[filename];
    }

    const audioCtx = getContext();
    if (!audioCtx) return null;

    try {
      const response = await fetch(`assets/sounds/${filename}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      bufferCache[filename] = decodedBuffer;
      return decodedBuffer;
    } catch (err) {
      console.warn(`Audio loading error for assets/sounds/${filename}:`, err);
      return null;
    }
  }

  /**
   * Plays a decoded audio buffer through Web Audio API
   */
  function playBufferNode(buffer, volume = 0.85) {
    const audioCtx = getContext();
    if (!audioCtx || !buffer) return null;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();

    source.buffer = buffer;
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);

    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    source.start(0);

    return { source, gainNode };
  }

  /**
   * Main sound effect playing method
   */
  function playFile(filename, volume = 0.85) {
    unlock();
    loadBuffer(filename).then(buffer => {
      if (buffer) {
        playBufferNode(buffer, volume);
      }
    });
  }

  function stopCountrySound() {
    if (activeSelectSource) {
      try {
        activeSelectSource.source.stop();
      } catch (e) {}
      activeSelectSource = null;
    }
  }

  function playCountrySound(countryId) {
    stopCountrySound();
    unlock();

    loadBuffer('get_pick.mp3').then(buffer => {
      if (buffer) {
        activeSelectSource = playBufferNode(buffer, 0.85);
      }
    });
  }

  function playPickSound() {
    playCountrySound();
  }

  function playWinnerSound() {
    stopCountrySound();

    if (activeWinnerSource) {
      try {
        activeWinnerSource.source.stop();
      } catch (e) {}
      activeWinnerSource = null;
    }

    const winnerFile = Math.random() < 0.5 ? 'winner_1.mp3' : 'winner_2.mp3';
    unlock();

    loadBuffer(winnerFile).then(buffer => {
      if (buffer) {
        activeWinnerSource = playBufferNode(buffer, 0.95);
      }
    });
  }

  function playVoice(type, callbacks = {}) {
    stopCountrySound();
    unlock();

    const onEnded = typeof callbacks === 'function' ? callbacks : callbacks.onEnded;
    const onHalfway = callbacks.onHalfway;
    const filename = type === 'choose_fighter' ? 'choose_fighter.mp3' : 'fight_start.mp3';

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

    loadBuffer(filename).then(buffer => {
      if (!buffer) {
        finish();
        return;
      }

      const playedNode = playBufferNode(buffer, 0.85);
      if (!playedNode) {
        finish();
        return;
      }

      const duration = buffer.duration;

      // Handle halfway callback
      const halfwayTime = type === 'fight_start' ? 850 : (duration * 0.45 * 1000);
      setTimeout(triggerHalfway, halfwayTime);

      // Handle end callback
      playedNode.source.onended = finish;
      setTimeout(finish, (duration + 0.2) * 1000);
    }).catch(() => finish());
  }

  function playUltiSound(callback) {
    unlock();
    let called = false;

    const finish = () => {
      if (!called) {
        called = true;
        if (callback) callback();
      }
    };

    loadBuffer('ulti.mp3').then(buffer => {
      if (!buffer) {
        finish();
        return;
      }

      const playedNode = playBufferNode(buffer, 0.85);
      if (!playedNode) {
        finish();
        return;
      }

      playedNode.source.onended = finish;
      setTimeout(finish, (buffer.duration + 0.2) * 1000);
    }).catch(() => finish());
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

  /**
   * Synthesized Web Audio API sound effects
   */
  function play(type) {
    const audioCtx = getContext();
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

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