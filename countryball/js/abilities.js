// ==========================================
// ABILITIES.JS - ULTIMATE ABILITY SYSTEM
// ==========================================

const AbilitySystem = (() => {
  const ABILITIES = {
    // 🇺🇸 USA - COMBINED BOTH LASER BEAM AND AIRSTRIKE
    'usa': {
      name: '📡 LASER & AIRSTRIKE 💣',
      bannerBg: 'rgba(0, 51, 160, 0.95)',
      bannerColor: '#ffffff',
      action: (ball) => {
        if (window.spawnNapalmStrike) window.spawnNapalmStrike(ball);
        if (window.spawnAirstrike) window.spawnAirstrike(ball, 2, 38, 9);
      }
    },

    // 🇨🇦 CANADA
    'canada': {
      name: '🍁 MAPLE BLIZZARD 🍁',
      bannerBg: 'rgba(200, 16, 46, 0.95)',
      bannerColor: '#ffffff',
      action: (ball) => {
        if (window.spawnMapleBlizzard) window.spawnMapleBlizzard(ball);
      }
    },

    // 🇨🇳 CHINA
    'china': {
      name: '🐉 CELESTIAL DRAGON 🐉',
      bannerBg: 'rgba(222, 41, 16, 0.95)',
      bannerColor: '#ffe600',
      action: (ball) => {
        if (window.triggerDragonTail) window.triggerDragonTail(ball);
      }
    },

    // 🇫🇷 FRANCE
    'france': {
      name: '🥖 BAGUETTE BARRAGE 🥖',
      bannerBg: 'rgba(0, 38, 84, 0.95)',
      bannerColor: '#ffffff',
      action: (ball) => {
        if (window.spawnBaguetteStorm) window.spawnBaguetteStorm(ball);
      }
    },

    // 🇩🇪 GERMANY
    'germany': {
      name: '⚡ AUTOBAHN PLOW ⚡',
      bannerBg: 'rgba(0, 0, 0, 0.95)',
      bannerColor: '#ffcc00',
      action: (ball) => {
        if (window.enableEnergyPlow) window.enableEnergyPlow(ball);
      }
    },

    // 🇮🇩 INDONESIA
    'indonesia': {
      name: '👻 SANTET LEECH 👻',
      bannerBg: 'rgba(120, 0, 150, 0.95)',
      bannerColor: '#ff00ff',
      action: (ball) => {
        if (window.spawnSantetLeech) window.spawnSantetLeech(ball);
      }
    },

    // 🇮🇹 ITALY
    'italy': {
      name: '🍕 PIZZA CUTTER 🍕',
      bannerBg: 'rgba(0, 146, 70, 0.95)',
      bannerColor: '#ffffff',
      action: (ball) => {
        if (window.spawnWallRidingPizza) window.spawnWallRidingPizza(ball);
      }
    },

    // 🇯🇵 JAPAN
    'japan': {
      name: '🌸 CHERRY BLOSSOM FLASH 🌸',
      bannerBg: 'rgba(180, 0, 60, 0.95)',
      bannerColor: '#ffb7c5',
      action: (ball) => {
        if (window.triggerCherryBlossomSlash) window.triggerCherryBlossomSlash(ball);
      }
    },

    // 🇲🇾 MALAYSIA
    'malaysia': {
      name: '🗡️ SPIRIT KERIS 🗡️',
      bannerBg: 'rgba(0, 43, 127, 0.95)',
      bannerColor: '#ffcc00',
      action: (ball) => {
        if (window.spawnOrbitingKeris) window.spawnOrbitingKeris(ball);
      }
    },

    // 🇰🇵 NORTH KOREA
    'north_korea': {
      name: '🚀 ICBM STRIKE 🚀',
      bannerBg: 'rgba(150, 0, 0, 0.95)',
      bannerColor: '#ff2200',
      action: (ball) => {
        if (window.spawnHeavyMissile) window.spawnHeavyMissile(ball);
      }
    },

    // 🇷🇺 RUSSIA
    'russia': {
      name: '❄️ SIBERIAN VORTEX ❄️',
      bannerBg: 'rgba(0, 57, 166, 0.95)',
      bannerColor: '#00ffff',
      action: (ball) => {
        if (window.spawnSnowVortex) window.spawnSnowVortex(ball);
      }
    },

    // 🇸🇬 SINGAPORE
    'singapore': {
      name: '🌊 MERLION TIDAL WAVE 🌊',
      bannerBg: 'rgba(237, 41, 57, 0.95)',
      bannerColor: '#ffffff',
      action: (ball) => {
        if (window.triggerTidalWave) window.triggerTidalWave(ball);
      }
    },

    // 🇰🇷 SOUTH KOREA
    'south_korea': {
      name: '🎤 NEON HYPNOSIS 🎤',
      bannerBg: 'rgba(15, 15, 30, 0.95)',
      bannerColor: '#00ffff',
      action: (ball) => {
        if (window.triggerNeonCharm) window.triggerNeonCharm(ball);
      }
    },

    // 🇬🇧 UK
    'uk': {
      name: '☕ TEAPOT SPILL ☕',
      bannerBg: 'rgba(1, 33, 105, 0.95)',
      bannerColor: '#ffffff',
      action: (ball) => {
        if (window.spawnTeapotSpill) window.spawnTeapotSpill(ball);
      }
    },

    // 🇵🇭 PHILIPPINES
    'philippines': {
      name: '🥊 GHOST PUNCHES 🥊',
      bannerBg: 'rgba(0, 56, 168, 0.95)',
      bannerColor: '#fcd116',
      action: (ball) => {
        if (window.triggerGhostPunches) window.triggerGhostPunches(ball);
      }
    },

    // 🇹🇭 THAILAND
    'thailand': {
      name: '🐘 KNEE STRIKE 🐘',
      bannerBg: 'rgba(165, 25, 40, 0.95)',
      bannerColor: '#ffffff',
      action: (ball) => {
        if (window.triggerKneeStrike) window.triggerKneeStrike(ball);
      }
    },

    // 🇻🇳 VIETNAM - REDUCED TO 3 TRAPS
    'vietnam': {
      name: '🎋 BAMBOO TRAPS 🎋',
      bannerBg: 'rgba(218, 37, 29, 0.95)',
      bannerColor: '#ffff00',
      action: (ball) => {
        if (window.spawnHiddenTraps) window.spawnHiddenTraps(ball, 3);
      }
    },

    // 🇮🇳 INDIA
    'india': {
      name: '🏏 RICOCHET BALL 🏏',
      bannerBg: 'rgba(255, 153, 51, 0.95)',
      bannerColor: '#138808',
      action: (ball) => {
        if (window.spawnRicochetCricketBall) window.spawnRicochetCricketBall(ball);
      }
    },

    // 🇧🇷 BRAZIL
    'brazil': {
      name: '⚽ CURVING FOOTBALL ⚽',
      bannerBg: 'rgba(0, 156, 59, 0.95)',
      bannerColor: '#ffdf00',
      action: (ball) => {
        if (window.spawnCurvingFootball) window.spawnCurvingFootball(ball);
      }
    },

    // 🇹🇷 TURKEY
    'turkey': {
      name: '💨 SMOKE SCREEN 💨',
      bannerBg: 'rgba(227, 10, 23, 0.95)',
      bannerColor: '#ffffff',
      action: (ball) => {
        if (window.spawnMortarSmoke) window.spawnMortarSmoke(ball);
      }
    }
  };

  function trigger(ball, type) {
    if (!ball || ball.silenceTimer > 0) return;

    const countryId = ball.config && ball.config.id ? ball.config.id.toLowerCase() : '';
    const ability = ABILITIES[countryId];

    if (ability) {
      ball.currentAbilityName = ability.name;
      
      const triggerBannerFn = (window.BattleSystem && window.BattleSystem.triggerCustomBanner) || window.triggerCustomBanner;
      if (triggerBannerFn) {
        triggerBannerFn(ability.name, ability.bannerBg, ability.bannerColor);
      }

      if (ability.action) {
        ability.action(ball);
      }
    }
  }

  return { trigger, ABILITIES };
})();

window.AbilitySystem = AbilitySystem;