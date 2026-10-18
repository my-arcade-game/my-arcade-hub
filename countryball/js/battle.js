// ==========================================
// BATTLE.JS - GPU-CACHED EMOJIS & STABLE ULT SYSTEM
// ==========================================

var BattleSystem = (() => {
  const canvas = document.getElementById('battleCanvas');
  const ctx = canvas.getContext('2d');
  
  let balls = [];
  let items = [];
  let airstrikes = [];
  let projectiles = [];
  let specialEffects = [];
  let hazards = [];
  let obstacles = [];
  let ghosts = [];
  let spiritDaggers = [];
  let hitTexts = [];
  let animationId = null;
  let onBattleComplete = null;
  let isGameOver = false;
  let isIntroSequence = true;
  let spawnTimer = 0;
  let matchTimer = 0;
  let suddenDeathTriggered = false;
  let rgbHue = 0;

  const GLOBAL_SPEED_MULT = 1.35;

  window.balls = balls;
  window.hitTexts = hitTexts;

  let shakeTimer = 0;
  let shakeIntensity = 0;

  // ==========================================
  // HIGH-PERFORMANCE EMOJI CACHE
  // ==========================================
  const emojiCache = {};
  function drawCachedEmoji(targetCtx, emoji, size) {
    if (!emoji) return;
    const key = `${emoji}_${size}`;
    if (!emojiCache[key]) {
      const c = document.createElement('canvas');
      const s = Math.ceil(size * 1.4);
      c.width = s;
      c.height = s;
      const cx = c.getContext('2d');
      cx.font = `${size}px sans-serif`;
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(emoji, s / 2, s / 2);
      emojiCache[key] = { canvas: c, half: s / 2 };
    }
    const cached = emojiCache[key];
    targetCtx.drawImage(cached.canvas, -cached.half, -cached.half);
  }

  function triggerShake(duration = 18, intensity = 10) {
    shakeTimer = duration;
    shakeIntensity = intensity;
  }

  function notifyUlt(caster) {
    balls.forEach(b => {
      if (b !== caster) b.onEnemyUltCast(caster);
    });
  }

  function getDamageScale() {
    const matchSec = Math.floor(matchTimer / 60);
    if (matchSec < 30) return 1.0;
    const scaled = 1.0 + (matchSec - 30) * 0.008;
    return Math.min(1.35, scaled);
  }

  class Ball {
    constructor(config, x, y, isP1) {
      this.config = config; 
      this.x = x; 
      this.y = y; 
      this.radius = 28; 
      this.maxHp = config.hp; 
      this.hp = config.hp; 
      this.isP1 = isP1; 

      this.lives = 2; 
      this.maxLives = 2; 
      this.immunityTimer = 0; 

      const angle = Math.random() * Math.PI * 2; 
      const initialSpeed = config.speed * GLOBAL_SPEED_MULT;
      this.vx = Math.cos(angle) * initialSpeed; 
      this.vy = Math.sin(angle) * initialSpeed; 

      this.weaponAngle = 0; 
      this.weaponSpeed = 0.11; 
      this.weaponOrbitRadius = this.radius + 12; 
      this.weaponCount = 1; 
      this.cooldown = 0; 

      this.targetSpeedMultiplier = 1.0; 
      this.damageMultiplier = 1.0;
      this.lifesteal = 0;
      this.dashTimer = 0; 
      this.shieldTimer = 0; 
      this.stunTimer = 0; 
      this.silenceTimer = 0;
      this.invisibleTimer = 0; 
      this.hypnosisTimer = 0;
      this.blindTimer = 0;
      this.electricTrailTimer = 0;
      this.burnTimer = 0; 
      this.currentAbilityName = ''; 
      this.auraColor = null; 
      this.isInvincible = false; 
      this.abilityInvincible = false; 
      this.hasTriggeredRage = false; 
      
      this.afterimages = []; 

      this.passiveName = this.assignPassive(config);
      this.passiveTimer = 0; 
      this.turtleShellTimer = 0; 
      this.zeroKnockbackFlag = false;
    }

    assignPassive(config) {
      if (!config) return 'NONE';
      if (config.passiveId) return config.passiveId;

      const cid = typeof config === 'object' && config.id ? config.id.toLowerCase() : '';
      if (cid === 'usa') return 'DEFENSE_BUDGET';
      if (cid === 'canada') return 'HEALTHCARE';
      if (cid === 'china') return 'GREAT_WALL';
      if (cid === 'france') return 'RESISTANCE';
      if (cid === 'germany') return 'AUTOBAHN';
      if (cid === 'indonesia') return 'RING_OF_FIRE';
      if (cid === 'italy') return 'RENAISSANCE';
      if (cid === 'japan') return 'NINJUTSU';
      if (cid === 'malaysia') return 'SILAT';
      if (cid === 'north_korea') return 'ISOLATION';
      if (cid === 'russia') return 'WINTER';
      if (cid === 'singapore') return 'FINE_CITY';
      if (cid === 'south_korea') return 'TURTLE_SHIP';
      if (cid === 'uk') return 'ISLAND';
      if (cid === 'philippines') return 'TYPHOON';
      if (cid === 'thailand') return 'CLINCH';
      if (cid === 'vietnam') return 'GUERRILLA';
      if (cid === 'india') return 'YOGA';
      if (cid === 'brazil') return 'CAPOEIRA';
      if (cid === 'turkey') return 'BOSPHORUS';

      return 'NONE';
    }

    onEnemyUltCast(enemyBall) {
      const pass = window.PassiveSystem && window.PassiveSystem[this.passiveName];
      if (pass && pass.onEnemyUlt) {
        pass.onEnemyUlt(this, enemyBall);
      }
    }

    takeDamage(amount) {
      if (this.isInvincible || this.immunityTimer > 0) return false; 

      const pass = window.PassiveSystem && window.PassiveSystem[this.passiveName];
      if (pass && pass.onDamage) {
        const evades = pass.onDamage(this, amount);
        if (evades) return false; 
      }

      this.hp -= amount; 

      if (this.hp <= 0) { 
        if (this.lives > 1) { 
          this.lives--; 
          this.hp = this.maxHp; 
          this.immunityTimer = 120; 
          
          hitTexts.push({ 
            text: '❤️ REVIVED! (2s IMMUNE)', 
            x: this.x, 
            y: this.y - 35, 
            life: 50, 
            color: '#05ffa1' 
          }); 

          if (window.AudioSystem && window.AudioSystem.playFile) { 
            window.AudioSystem.playFile('healspawn.mp3'); 
          }
        } else {
          this.hp = 0; 
          this.lives = 0; 
        }
      }
      return true; 
    }

    update() {
      if (isIntroSequence) return; 

      const pass = window.PassiveSystem && window.PassiveSystem[this.passiveName];
      if (pass && pass.onUpdate) {
        pass.onUpdate(this);
      }

      if (this.burnTimer > 0) {
        this.burnTimer--;
        if (this.burnTimer % 12 === 0 && !this.isInvincible) {
          this.takeDamage(1.0);
        }
      }

      if (this.stunTimer > 0) { 
        this.stunTimer--; 
        this.vx *= 0.8; 
        this.vy *= 0.8; 
        return; 
      }

      if (this.immunityTimer > 0) this.immunityTimer--; 
      if (this.invisibleTimer > 0) this.invisibleTimer--; 
      if (this.silenceTimer > 0) this.silenceTimer--;
      if (this.blindTimer > 0) this.blindTimer--;

      if (this.hypnosisTimer > 0) {
        this.hypnosisTimer--;
        if (Math.floor(this.hypnosisTimer / 15) % 2 === 0) {
          this.vx *= -1.02;
          this.vy *= -1.02;
        }
      }

      if (this.electricTrailTimer > 0) {
        this.electricTrailTimer--;
        if (this.electricTrailTimer % 6 === 0) {
          hazards.push({
            type: 'electric_trail',
            x: this.x,
            y: this.y,
            radius: 18,
            life: 90,
            owner: this
          });
        }
      }

      this.x += this.vx; 
      this.y += this.vy; 

      if (this.dashTimer > 0) this.dashTimer--; 
      if (this.shieldTimer > 0) this.shieldTimer--; 

      this.isInvincible = (this.shieldTimer > 0) || (this.invisibleTimer > 0) || (this.immunityTimer > 0) || (this.turtleShellTimer > 0) || this.abilityInvincible; 

      const matchSec = Math.floor(matchTimer / 60);
      const suddenDeathSpeedBoost = matchSec >= 60 ? 1.15 : 1.0;
      const dashBoost = this.dashTimer > 0 ? 2.0 : 1.0; 
      const desiredSpeed = this.config.speed * GLOBAL_SPEED_MULT * this.targetSpeedMultiplier * dashBoost * suddenDeathSpeedBoost; 

      const currentSpeed = Math.hypot(this.vx, this.vy); 
      if (currentSpeed > desiredSpeed) { 
        this.vx *= 0.96; 
        this.vy *= 0.96; 
      } else if (currentSpeed < desiredSpeed && currentSpeed > 0) { 
        const factor = desiredSpeed / currentSpeed; 
        this.vx *= factor; 
        this.vy *= factor; 
      }

      const margin = this.radius + 12; 
      let bounced = false; 

      if (this.x - margin < 0) { this.x = margin; this.vx = Math.abs(this.vx); this.vy += (Math.random() - 0.5) * 0.8; bounced = true; } 
      if (this.x + margin > canvas.width) { this.x = canvas.width - margin; this.vx = -Math.abs(this.vx); this.vy += (Math.random() - 0.5) * 0.8; bounced = true; } 
      if (this.y - margin < 60) { this.y = margin + 60; this.vy = Math.abs(this.vy); this.vx += (Math.random() - 0.5) * 0.8; bounced = true; } 
      if (this.y + margin > canvas.height - 20) { this.y = canvas.height - 20 - margin; this.vy = -Math.abs(this.vy); this.vx += (Math.random() - 0.5) * 0.8; bounced = true; } 

      if (bounced && !isGameOver && window.AudioSystem) AudioSystem.play('bounce'); 

      const weaponSpeedBoost = matchSec >= 60 ? 1.2 : 1.0;
      this.weaponAngle += this.weaponSpeed * weaponSpeedBoost; 
      if (this.cooldown > 0) this.cooldown--; 

      if (this.hp / this.maxHp <= 0.20 && !this.hasTriggeredRage && !isGameOver) { 
        this.hasTriggeredRage = true; 
        triggerShake(15, 8); 
        if (window.AbilitySystem) window.AbilitySystem.trigger(this, 'RAGE'); 
        hitTexts.push({ text: '🔥 RAGE! (+50% DMG) 🔥', x: this.x, y: this.y - 35, life: 45, color: '#ff0033' }); 
      }

      if (this.hasTriggeredRage) {
        this.afterimages.push({ x: this.x, y: this.y, life: 10, maxLife: 10 });
      }
      for (let i = this.afterimages.length - 1; i >= 0; i--) {
        this.afterimages[i].life--;
        if (this.afterimages[i].life <= 0) {
          this.afterimages.splice(i, 1);
        }
      }
    }

    draw() {
      const pass = window.PassiveSystem && window.PassiveSystem[this.passiveName];
      if (pass && pass.onDraw) {
        pass.onDraw(this, ctx);
      }

      if (this.hasTriggeredRage && this.afterimages.length > 0) {
        this.afterimages.forEach(img => {
          ctx.save();
          ctx.translate(img.x, img.y);
          ctx.globalAlpha = (img.life / img.maxLife) * 0.4; 
          ctx.beginPath();
          ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#ff0033'; 
          ctx.fill();
          ctx.restore();
        });
      }

      ctx.save();
      ctx.translate(this.x, this.y);

      if (this.hasTriggeredRage) {
        const pulse = 1 + (Math.sin(Date.now() * 0.015) + 1) * 0.05;
        ctx.scale(pulse, pulse);
      }

      if (this.immunityTimer > 0) {
        const isFaded = Math.floor(this.immunityTimer / 4) % 2 === 0;
        ctx.globalAlpha = isFaded ? 0.25 : 0.9;
      } else if (this.invisibleTimer > 0) {
        ctx.globalAlpha = Math.floor(this.invisibleTimer / 3) % 2 === 0 ? 0.15 : 0.7;
      } else {
        ctx.globalAlpha = 1.0;
      }

      if (this.hasTriggeredRage) {
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 0, 51, 0.6)';
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.config.color;
      ctx.fill();

      const img = this.config.loadedImg;
      if (img && img.complete && img.naturalWidth !== 0) {
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const targetRadius = this.radius - 1;
        const targetDiameter = targetRadius * 2;

        let drawW, drawH, drawX, drawY;

        if (imgAspect >= 1) {
          drawH = targetDiameter;
          drawW = targetDiameter * imgAspect;
          drawX = -drawW / 2;
          drawY = -targetRadius;
        } else {
          drawW = targetDiameter;
          drawH = targetDiameter / imgAspect;
          drawX = -targetRadius;
          drawY = -drawH / 2;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, targetRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();
      } else {
        drawCachedEmoji(ctx, this.config.flag, 26);
      }

      ctx.lineWidth = this.hasTriggeredRage ? 5 : 3; 
      ctx.strokeStyle = this.hasTriggeredRage ? '#ff0033' : (this.isP1 ? '#00f0ff' : '#ff0055');
      ctx.stroke();

      if (this.immunityTimer > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 7, 0, Math.PI * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ffe600';
        ctx.stroke();
      } else if (this.shieldTimer > 0 || this.abilityInvincible) {
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#00ffff';
        ctx.stroke();
      }

      if (this.burnTimer > 0) {
        ctx.save();
        ctx.translate(0, -this.radius - 10);
        drawCachedEmoji(ctx, '🔥', 20);
        ctx.restore();
      } else if (this.stunTimer > 0) {
        ctx.save();
        ctx.translate(0, -this.radius - 10);
        drawCachedEmoji(ctx, '💫', 20);
        ctx.restore();
      } else if (this.silenceTimer > 0) {
        ctx.save();
        ctx.translate(0, -this.radius - 10);
        drawCachedEmoji(ctx, '🔇', 20);
        ctx.restore();
      } else if (this.hypnosisTimer > 0) {
        ctx.save();
        ctx.translate(0, -this.radius - 10);
        drawCachedEmoji(ctx, '🌀', 20);
        ctx.restore();
      }

      ctx.restore();

      for (let i = 0; i < this.weaponCount; i++) {
        const curAngle = this.weaponAngle + (i * (Math.PI * 2) / this.weaponCount);
        const wx = this.x + Math.cos(curAngle) * (this.weaponOrbitRadius + 15); 
        const wy = this.y + Math.sin(curAngle) * (this.weaponOrbitRadius + 15);

        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(curAngle + (Math.PI * 1.25)); 
        drawCachedEmoji(ctx, this.config.weapon, 40);
        ctx.restore();
      }
    }
  }

  function drawCanvasFrame() {
    rgbHue = (rgbHue + 1) % 360;
    const matchSec = Math.floor(matchTimer / 60);
    const color = matchSec >= 60 ? `hsl(${Date.now() * 0.5 % 360}, 100%, 50%)` : `hsl(${rgbHue}, 100%, 50%)`;

    ctx.save();
    ctx.lineWidth = matchSec >= 60 ? 6 : 4;
    ctx.strokeStyle = color;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    ctx.restore();
  }

  function triggerIntroBanner() {
    isIntroSequence = true; 
    const overlay = document.getElementById('banner-overlay');
    const text = document.getElementById('banner-text');
    if (!overlay || !text) {
      isIntroSequence = false;
      return;
    }

    overlay.style.background = '';
    overlay.style.borderTop = '';
    overlay.style.borderBottom = '';

    overlay.classList.remove('show');
    void overlay.offsetWidth; 

    text.innerHTML = 'READY...';
    text.className = 'banner-ready';
    text.style.color = '';
    overlay.classList.add('show');

    if (window.AudioSystem && window.AudioSystem.playVoice) {
      window.AudioSystem.playVoice('fight_start');
    }

    setTimeout(() => {
      text.innerHTML = 'FIGHT!';
      text.className = 'banner-fight';
      triggerShake(14, 8);

      setTimeout(() => {
        overlay.classList.remove('show');
        isIntroSequence = false; 
      }, 1600);
    }, 1400);
  }

  function triggerCustomBanner(textString, bgColor, textColor) {
    const overlay = document.getElementById('banner-overlay');
    const text = document.getElementById('banner-text');
    if (!overlay || !text) return;

    overlay.classList.remove('show');
    void overlay.offsetWidth;

    text.innerHTML = textString;
    text.className = 'banner-ult';
    text.style.color = textColor || '#ffe600';

    overlay.style.background = bgColor || 'rgba(180, 0, 0, 0.95)';
    overlay.style.borderTop = '3px solid ' + (textColor || '#ffe600');
    overlay.style.borderBottom = '3px solid ' + (textColor || '#ffe600');

    overlay.classList.add('show');

    triggerShake(24, 12);

    if (window.AudioSystem && window.AudioSystem.playUltiSound) {
      window.AudioSystem.playUltiSound();
    }

    if (window.bannerTimeout) clearTimeout(window.bannerTimeout);
    window.bannerTimeout = setTimeout(() => {
      overlay.classList.remove('show');
    }, 1800);
  }

  function spawnBaguetteStorm(ownerBall, count = 10, damage = 8) {
    notifyUlt(ownerBall);

    projectiles = projectiles.filter(p => !(p.type === 'baguette' && p.owner === ownerBall));

    const enemy = balls.find(b => b !== ownerBall);
    if (enemy) {
      const dashAngle = Math.atan2(enemy.y - ownerBall.y, enemy.x - ownerBall.x);
      ownerBall.vx += Math.cos(dashAngle) * 16;
      ownerBall.vy += Math.sin(dashAngle) * 16;
    }
    ownerBall.dashTimer = 90;

    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count;
      const speed = 9.5;
      projectiles.push({
        type: 'baguette',
        x: ownerBall.x + Math.cos(angle) * 35,
        y: ownerBall.y + Math.sin(angle) * 35,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: damage,
        owner: ownerBall,
        radius: 14,
        spinAngle: Math.random() * Math.PI,
        life: 180
      });
    }

    if (window.AudioSystem) AudioSystem.playFile('slice.mp3');
  }

  function spawnBaguetteWalls(ownerBall) {
    spawnBaguetteStorm(ownerBall, 10, 8);
  }

  function spawnOrbitingKeris(ownerBall, count = 3) {
    notifyUlt(ownerBall);
    const enemy = balls.find(b => b !== ownerBall);
    if (!enemy) return;

    const baseAngle = Math.atan2(enemy.y - ownerBall.y, enemy.x - ownerBall.x);
    const speed = 13;
    const spreadAngles = [-0.22, 0, 0.22];

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (spreadAngles[i] || 0);
      projectiles.push({
        type: 'keris_dagger',
        x: ownerBall.x + Math.cos(angle) * (ownerBall.radius + 10),
        y: ownerBall.y + Math.sin(angle) * (ownerBall.radius + 10),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: 7,
        owner: ownerBall,
        radius: 14,
        life: 180
      });
    }

    if (window.AudioSystem && window.AudioSystem.playFile) {
      window.AudioSystem.playFile('slice.mp3');
    }
  }

  function updateKerisDaggers() {}
  function drawKerisDaggers() {}

  function spawnNapalmStrike(ownerBall, duration = 240) {
    notifyUlt(ownerBall);
    const enemy = balls.find(b => b !== ownerBall) || ownerBall;
    specialEffects.push({
      type: 'defcon_laser',
      owner: ownerBall,
      targetX: enemy.x,
      targetY: enemy.y,
      duration: duration,
      life: 120, 
      maxLife: 120
    });
  }

  function spawnAirstrike(ownerBall, count = 2, radius = 38, damage = 9) {
    notifyUlt(ownerBall);
    const targetBall = balls.find(b => b !== ownerBall) || ownerBall;

    for (let i = 0; i < count; i++) {
      const targetX = i === 0 ? targetBall.x + (Math.random() - 0.5) * 30 : 50 + Math.random() * (canvas.width - 100);
      const targetY = i === 0 ? targetBall.y + (Math.random() - 0.5) * 30 : 100 + Math.random() * (canvas.height - 180);

      airstrikes.push({
        x: targetX,
        y: targetY,
        radius: radius,
        warningTimer: 50 + (i * 20),
        explosionTimer: 18,
        damage: damage,
        owner: ownerBall,
        exploded: false
      });
    }
  }

  function spawnTeapotSpill(ownerBall) {
    notifyUlt(ownerBall);
    const enemy = balls.find(b => b !== ownerBall);
    if (enemy && !enemy.isInvincible) {
      const scaldDmg = Math.round(10 * getDamageScale());
      enemy.takeDamage(scaldDmg);
      hitTexts.push({ text: `☕ SCALDING TEA -${scaldDmg}`, x: enemy.x, y: enemy.y - 30, life: 35, color: '#8b4513' });
    }

    hazards.push({
      type: 'tea_spill',
      x: canvas.width / 2,
      y: canvas.height / 2 + 20,
      radius: 140,
      life: 240, 
      owner: ownerBall
    });
    triggerShake(15, 8);
    if (window.AudioSystem) window.AudioSystem.playFile('boom.mp3');
  }

  function spawnSnowVortex(ownerBall, duration = 360) {
    notifyUlt(ownerBall);
    hazards.push({
      type: 'siberian_vortex',
      x: canvas.width / 2,
      y: canvas.height / 2,
      radius: 180,
      life: duration, 
      owner: ownerBall
    });
    triggerShake(20, 10);
  }

  function triggerCherryBlossomSlash(ownerBall) {
    notifyUlt(ownerBall);
    const enemy = balls.find(b => b !== ownerBall);
    if (!enemy) return;

    specialEffects.push({
      type: 'cherry_blossom_flash',
      owner: ownerBall,
      target: enemy,
      life: 45,
      maxLife: 45,
      hasAttacked: false
    });
  }

  function spawnSantetLeech(ownerBall, duration = 300) {
    notifyUlt(ownerBall);
    const enemy = balls.find(b => b !== ownerBall);
    if (!enemy) return;

    ghosts.push({
      owner: ownerBall,
      target: enemy,
      x: ownerBall.x,
      y: ownerBall.y,
      speed: 1.35,
      attached: false,
      chaseTimer: 180,
      leechTimer: duration 
    });
  }

  function updateGhosts() {
    const matchSec = Math.floor(matchTimer / 60);
    const healMod = matchSec >= 45 ? 0.5 : 1.0; 

    for (let i = ghosts.length - 1; i >= 0; i--) {
      const g = ghosts[i];

      if (!g.target || g.target.hp <= 0) {
        const enemy = balls.find(b => b !== g.owner);
        if (enemy) g.target = enemy;
      }

      if (g.target && !g.attached) {
        g.chaseTimer--;

        if (g.chaseTimer <= 0) {
          if (typeof hitTexts !== 'undefined') {
            hitTexts.push({ text: '👻 SANTET MISSED!', x: g.x, y: g.y - 20, life: 25, color: '#aa88ff' });
          }
          ghosts.splice(i, 1);
          continue;
        }

        const dx = g.target.x - g.x;
        const dy = g.target.y - g.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0) {
          g.x += (dx / dist) * g.speed;
          g.y += (dy / dist) * g.speed;
        }

        if (dist < g.target.radius + 12) {
          g.attached = true;
          if (typeof hitTexts !== 'undefined') {
            hitTexts.push({ text: '👻 SANTET ATTACHED!', x: g.target.x, y: g.target.y - 30, life: 30, color: '#d800ff' });
          }
        }
      } else if (g.attached && g.target) {
        g.x = g.target.x;
        g.y = g.target.y;
        g.leechTimer--;

        if (g.leechTimer % 22 === 0 && !g.target.isInvincible) {
          const leechAmount = 0.8;
          g.target.takeDamage(leechAmount);
          g.owner.hp = Math.min(g.owner.maxHp, g.owner.hp + (leechAmount * healMod)); 
        }

        if (g.leechTimer <= 0) {
          ghosts.splice(i, 1);
          continue;
        }
      }

      if (!g.target) ghosts.splice(i, 1);
    }
  }

  function drawGhosts() {
    ghosts.forEach(g => {
      ctx.save();
      ctx.translate(g.x, g.y - 15);
      drawCachedEmoji(ctx, '👻', 28);
      ctx.restore();
    });
  }

  function triggerTidalWave(ownerBall) {
    notifyUlt(ownerBall);
    const enemy = balls.find(b => b !== ownerBall);
    if (!enemy) return;

    const angle = Math.atan2(enemy.y - ownerBall.y, enemy.x - ownerBall.x);
    specialEffects.push({
      type: 'merlion_beam',
      x1: ownerBall.x,
      y1: ownerBall.y,
      x2: ownerBall.x + Math.cos(angle) * 600,
      y2: ownerBall.y + Math.sin(angle) * 600,
      life: 25
    });

    triggerShake(16, 9);

    if (!enemy.isInvincible) {
      const dmg = Math.round(16 * getDamageScale());
      const tookDmg = enemy.takeDamage(dmg);
      if (tookDmg) {
        enemy.vx += Math.cos(angle) * 25;
        enemy.vy += Math.sin(angle) * 25;
        hitTexts.push({ text: `🌊 TIDAL WAVE -${dmg}`, x: enemy.x, y: enemy.y - 30, life: 40, color: '#00f0ff' });
      }
    }
  }

  function triggerNeonCharm(ownerBall, duration = 120) {
    notifyUlt(ownerBall);
    const enemy = balls.find(b => b !== ownerBall);
    if (enemy) {
      enemy.hypnosisTimer = duration; 
      if (!enemy.isInvincible) {
        const dmg = Math.round(12 * getDamageScale());
        enemy.takeDamage(dmg);
        hitTexts.push({ text: `🎤 NEON HYPNOSIS -${dmg}`, x: enemy.x, y: enemy.y - 35, life: 40, color: '#00ffff' });
      }
    }
  }

  function spawnHeavyMissile(ownerBall) {
    notifyUlt(ownerBall);
    obstacles.push({
      type: 'heavy_icbm',
      owner: ownerBall,
      x: canvas.width / 2,
      y: -50,
      vx: 0,
      vy: 1.6, 
      radius: 35,
      life: 400
    });
  }

  function spawnWallRidingPizza(ownerBall, duration = 480) {
    notifyUlt(ownerBall);
    const enemy = balls.find(b => b !== ownerBall) || ownerBall;
    const angle = Math.atan2(enemy.y - ownerBall.y, enemy.x - ownerBall.x);
    projectiles.push({
      type: 'pizza_cutter',
      x: ownerBall.x,
      y: ownerBall.y,
      vx: Math.cos(angle) * 9,
      vy: Math.sin(angle) * 9,
      damage: 8,
      owner: ownerBall,
      radius: 28,
      spinAngle: 0,
      life: duration
    });
  }

  function triggerDragonTail(ownerBall) {
    notifyUlt(ownerBall);
    const enemy = balls.find(b => b !== ownerBall);
    if (!enemy) return;

    specialEffects.push({
      type: 'celestial_dragon',
      owner: ownerBall,
      target: enemy,
      x: ownerBall.x,
      y: ownerBall.y,
      life: 45,
      maxLife: 45,
      damage: 18,
      hasAttacked: false
    });
  }

  function spawnMapleBlizzard(ownerBall, duration = 300) {
    notifyUlt(ownerBall);
    for (let i = 0; i < 3; i++) {
      hazards.push({
        type: 'maple_syrup',
        x: 60 + Math.random() * (canvas.width - 120),
        y: 100 + Math.random() * (canvas.height - 200),
        radius: 55,
        life: duration,
        owner: ownerBall
      });
    }
  }

  function enableEnergyPlow(ownerBall) {
    notifyUlt(ownerBall);
    ownerBall.electricTrailTimer = 120;
    ownerBall.dashTimer = 100;

    const enemy = balls.find(b => b !== ownerBall);
    if (enemy) {
      const angle = Math.atan2(enemy.y - ownerBall.y, enemy.x - ownerBall.x);
      ownerBall.vx += Math.cos(angle) * 20;
      ownerBall.vy += Math.sin(angle) * 20;
      if (!enemy.isInvincible && Math.hypot(enemy.x - ownerBall.x, enemy.y - ownerBall.y) < 120) {
        const dmg = Math.round(14 * getDamageScale());
        enemy.takeDamage(dmg);
        hitTexts.push({ text: `⚡ AUTOBAHN PLOW -${dmg}`, x: enemy.x, y: enemy.y - 30, life: 35, color: '#ffcc00' });
      }
    }
  }

  function triggerGhostPunches(ownerBall) {
    notifyUlt(ownerBall);
    const enemy = balls.find(b => b !== ownerBall);
    if (!enemy) return;

    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        if (isGameOver || !enemy) return;
        const angle = Math.atan2(enemy.y - ownerBall.y, enemy.x - ownerBall.x);
        enemy.vx += Math.cos(angle) * 8;
        enemy.vy += Math.sin(angle) * 8;
        const pDmg = Math.round(3 * getDamageScale());
        enemy.takeDamage(pDmg);
        hitTexts.push({ text: `🥊 PUNCH -${pDmg}`, x: enemy.x, y: enemy.y - 30, life: 25, color: '#fcd116' });
      }, i * 90);
    }
  }

  function triggerKneeStrike(ownerBall, duration = 150) {
    notifyUlt(ownerBall);
    const enemy = balls.find(b => b !== ownerBall);
    if (!enemy) return;

    const angle = Math.atan2(enemy.y - ownerBall.y, enemy.x - ownerBall.x);
    enemy.vx += Math.cos(angle) * 30;
    enemy.vy += Math.sin(angle) * 30;
    enemy.silenceTimer = duration; 
    enemy.stunTimer = 60;
    const dmg = Math.round(16 * getDamageScale());
    enemy.takeDamage(dmg);
    hitTexts.push({ text: `🐘 KNEE STRIKE -${dmg}`, x: enemy.x, y: enemy.y - 35, life: 40, color: '#ffffff' });
  }

  function spawnHiddenTraps(ownerBall, count = 3) {
    notifyUlt(ownerBall);
    for (let i = 0; i < count; i++) {
      hazards.push({
        type: 'bamboo_trap',
        x: 60 + Math.random() * (canvas.width - 120),
        y: 100 + Math.random() * (canvas.height - 200),
        radius: 25,
        life: 360,
        owner: ownerBall
      });
    }
  }

  function spawnRicochetCricketBall(ownerBall, bounces = 6) {
    notifyUlt(ownerBall);
    const enemy = balls.find(b => b !== ownerBall) || ownerBall;
    const angle = Math.atan2(enemy.y - ownerBall.y, enemy.x - ownerBall.x);
    projectiles.push({
      type: 'cricket_ball',
      x: ownerBall.x,
      y: ownerBall.y,
      vx: Math.cos(angle) * 14,
      vy: Math.sin(angle) * 14,
      damage: 6,
      owner: ownerBall,
      radius: 12,
      bounces: bounces
    });
  }

  function spawnCurvingFootball(ownerBall) {
    notifyUlt(ownerBall);
    const enemy = balls.find(b => b !== ownerBall) || ownerBall;
    const angle = Math.atan2(enemy.y - ownerBall.y, enemy.x - ownerBall.x);
    projectiles.push({
      type: 'football',
      x: ownerBall.x,
      y: ownerBall.y,
      vx: Math.cos(angle) * 12,
      vy: Math.sin(angle) * 12,
      curve: 0.18,
      damage: 15,
      owner: ownerBall,
      radius: 16,
      bounces: 3
    });
  }

  function spawnMortarSmoke(ownerBall, duration = 120) {
    notifyUlt(ownerBall);
    const enemy = balls.find(b => b !== ownerBall);
    if (!enemy) return;

    hazards.push({
      type: 'smoke_cloud',
      x: enemy.x,
      y: enemy.y,
      radius: 90,
      life: duration,
      owner: ownerBall
    });
    enemy.silenceTimer = duration;
    enemy.blindTimer = duration;
    const dmg = Math.round(12 * getDamageScale());
    enemy.takeDamage(dmg);
  }

  function updateAirstrikes() {
    if (isIntroSequence) return;

    for (let i = airstrikes.length - 1; i >= 0; i--) {
      const strike = airstrikes[i];
      if (strike.warningTimer > 0) {
        strike.warningTimer--;
      } else if (!strike.exploded) {
        strike.exploded = true;

        triggerShake(10, 5);
        if (window.AudioSystem) window.AudioSystem.playFile('boom.mp3');

        balls.forEach(ball => {
          if (ball !== strike.owner && !ball.isInvincible) {
            const baseDmg = strike.owner.hasTriggeredRage ? strike.damage * 1.5 : strike.damage;
            const dmg = Math.round(baseDmg * getDamageScale());

            const tookDmg = ball.takeDamage(dmg);

            if (tookDmg) {
              const angle = Math.atan2(ball.y - strike.y, ball.x - strike.x);
              ball.vx += Math.cos(angle) * 12;
              ball.vy += Math.sin(angle) * 12;

              hitTexts.push({ text: `💣 BOMB -${dmg}`, x: ball.x, y: ball.y - 30, life: 30, color: '#ff2200' });
            }
          }
        });
      } else {
        strike.explosionTimer--;
        if (strike.explosionTimer <= 0) airstrikes.splice(i, 1);
      }
    }
  }

  function drawAirstrikes() {
    airstrikes.forEach(strike => {
      if (!strike.exploded) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(strike.x, strike.y, strike.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ff0000';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(strike.x - strike.radius - 4, strike.y);
        ctx.lineTo(strike.x + strike.radius + 4, strike.y);
        ctx.moveTo(strike.x, strike.y - strike.radius - 4);
        ctx.lineTo(strike.x, strike.y + strike.radius + 4);
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        ctx.beginPath();
        ctx.arc(strike.x, strike.y, strike.radius * 1.1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 100, 0, 0.6)';
        ctx.fill();
        ctx.strokeStyle = '#ffe600';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.translate(strike.x, strike.y);
        drawCachedEmoji(ctx, '💥', 28);
        ctx.restore();
      }
    });
  }

  function updateHazards() {
    for (let i = hazards.length - 1; i >= 0; i--) {
      const h = hazards[i];
      h.life--;

      balls.forEach(ball => {
        if (ball !== h.owner) {
          const dist = Math.hypot(ball.x - h.x, ball.y - h.y);
          if (dist < ball.radius + h.radius) {
            if (h.type === 'tea_spill') {
              ball.targetSpeedMultiplier = 0.5; 
              ball.dashTimer = 0;
            } else if (h.type === 'maple_syrup') {
              ball.targetSpeedMultiplier = 0.4; 
              ball.dashTimer = 0;
              if (h.life % 20 === 0 && !ball.isInvincible) {
                ball.takeDamage(1.5);
                hitTexts.push({ text: '❄️ FROST -1.5', x: ball.x, y: ball.y - 25, life: 20, color: '#00ffff' });
              }
            } else if (h.type === 'siberian_vortex') {
              ball.vx += (h.x - ball.x) * 0.02;
              ball.vy += (h.y - ball.y) * 0.02;
              ball.takeDamage(0.12);
            } else if (h.type === 'electric_trail') {
              ball.takeDamage(0.4);
            } else if (h.type === 'bamboo_trap') {
              const trapDmg = Math.round(12 * getDamageScale());
              ball.takeDamage(trapDmg);
              ball.stunTimer = 48; 
              hitTexts.push({ text: `🎋 BAMBOO TRAPPED -${trapDmg}`, x: ball.x, y: ball.y - 30, life: 30, color: '#00ff55' });
              hazards.splice(i, 1);
              return;
            }
          }
        }
      });

      if (h.life <= 0) hazards.splice(i, 1);
    }
  }

  function drawHazards() {
    hazards.forEach(h => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);

      if (h.type === 'tea_spill') {
        ctx.fillStyle = 'rgba(120, 60, 20, 0.45)';
        ctx.fill();
        ctx.strokeStyle = '#8b4513';
        ctx.stroke();
      } else if (h.type === 'maple_syrup') {
        ctx.fillStyle = 'rgba(218, 112, 214, 0.35)';
        ctx.fill();
      } else if (h.type === 'siberian_vortex') {
        ctx.fillStyle = 'rgba(150, 220, 255, 0.2)';
        ctx.fill();
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.stroke();
      } else if (h.type === 'electric_trail') {
        ctx.fillStyle = 'rgba(255, 204, 0, 0.4)';
        ctx.fill();
      } else if (h.type === 'bamboo_trap') {
        ctx.fillStyle = 'rgba(0, 200, 80, 0.3)';
        ctx.fill();
        ctx.strokeStyle = '#00ff55';
        ctx.stroke();
      } else if (h.type === 'smoke_cloud') {
        ctx.fillStyle = 'rgba(50, 50, 50, 0.65)';
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.life--;

      if (obs.type === 'heavy_icbm') {
        obs.y += obs.vy;
      }

      balls.forEach(ball => {
        const dist = Math.hypot(ball.x - obs.x, ball.y - obs.y);
        const minDist = ball.radius + obs.radius;

        if (dist < minDist) {
          const angle = Math.atan2(ball.y - obs.y, ball.x - obs.x);
          const overlap = minDist - dist;

          ball.x += Math.cos(angle) * overlap;
          ball.y += Math.sin(angle) * overlap;
          ball.vx *= -0.8;
          ball.vy *= -0.8;

          if (obs.type === 'heavy_icbm' && ball !== obs.owner && !ball.isInvincible) {
            const icbmDmg = Math.round(22 * getDamageScale());
            ball.takeDamage(icbmDmg);
            triggerShake(18, 10);
            hitTexts.push({ text: `🚀 ICBM IMPACT -${icbmDmg}`, x: ball.x, y: ball.y - 30, life: 40, color: '#ff0000' });
            obstacles.splice(i, 1);
            return;
          }
        }
      });

      if (obs.life <= 0 || obs.y > canvas.height + 60) obstacles.splice(i, 1);
    }
  }

  function drawObstacles() {
    obstacles.forEach(obs => {
      ctx.save();
      ctx.translate(obs.x, obs.y);
      drawCachedEmoji(ctx, '🚀', 54);
      ctx.restore();
    });
  }

  function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      
      if (p.type === 'football' && p.curve) {
        p.vx += Math.cos(Date.now() * 0.01) * p.curve;
        p.vy += Math.sin(Date.now() * 0.01) * p.curve;
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.type === 'baguette' || p.type === 'keris_dagger') {
        p.life--;

        if (p.x - p.radius < 8) { p.x = 8 + p.radius; p.vx *= -1; }
        if (p.x + p.radius > canvas.width - 8) { p.x = canvas.width - 8 - p.radius; p.vx *= -1; }
        if (p.y - p.radius < 64) { p.y = 64 + p.radius; p.vy *= -1; }
        if (p.y + p.radius > canvas.height - 24) { p.y = canvas.height - 24 - p.radius; p.vy *= -1; }

        if (p.life <= 0) {
          projectiles.splice(i, 1);
          continue;
        }
      }

      if (p.type === 'pizza_cutter' || p.type === 'cricket_ball' || p.type === 'football') {
        p.spinAngle = (p.spinAngle || 0) + 0.2;
        if (p.x < 10 || p.x > canvas.width - 10) { p.vx *= -1; if (p.bounces) p.bounces--; }
        if (p.y < 70 || p.y > canvas.height - 20) { p.vy *= -1; if (p.bounces) p.bounces--; }
        if (p.bounces !== undefined && p.bounces <= 0) { projectiles.splice(i, 1); continue; }
      }

      let hit = false;
      balls.forEach(ball => {
        if (ball !== p.owner && !ball.isInvincible) {
          const dist = Math.hypot(ball.x - p.x, ball.y - p.y);
          if (dist < ball.radius + p.radius) {
            const finalDmg = Math.round(p.damage * getDamageScale());

            const tookDmg = ball.takeDamage(finalDmg);
            if (tookDmg) {
              ball.vx += p.vx * 0.8;
              ball.vy += p.vy * 0.8;
              hitTexts.push({ text: `-${finalDmg}`, x: ball.x, y: ball.y - 25, life: 25, color: '#ff0055' });
              hit = true;
            }
          }
        }
      });

      if (hit) projectiles.splice(i, 1);
    }
  }

  function drawProjectiles() {
    projectiles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.type === 'baguette') {
        ctx.rotate(p.spinAngle || 0);
        drawCachedEmoji(ctx, '🥖', 32);
      } else if (p.type === 'keris_dagger') {
        ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2);
        drawCachedEmoji(ctx, '🗡️', 34);
      } else if (p.type === 'pizza_cutter') {
        ctx.rotate(p.spinAngle || 0);
        drawCachedEmoji(ctx, '🍕', 48);
      } else if (p.type === 'cricket_ball') {
        drawCachedEmoji(ctx, '🏏', 24);
      } else if (p.type === 'football') {
        ctx.rotate(p.spinAngle || 0);
        drawCachedEmoji(ctx, '⚽', 32);
      }
      ctx.restore();
    });
  }

  function updateSpecialEffects() {
    for (let i = specialEffects.length - 1; i >= 0; i--) {
      const eff = specialEffects[i];
      eff.life--;

      if (eff.type === 'defcon_laser') {
        balls.forEach(b => {
          if (b !== eff.owner && !b.isInvincible) {
            if (Math.abs(b.x - eff.targetX) < b.radius + 6) {
              const beamDmg = eff.owner.hasTriggeredRage ? 0.35 : 0.2;
              b.takeDamage(beamDmg);
              if (eff.life % 20 === 0) {
                hitTexts.push({ text: '⚡ LASER BURN!', x: b.x, y: b.y - 30, life: 25, color: '#ff2200' });
              }
            }
          }
        });

        if (eff.life === 1) {
          triggerShake(10, 5);
          balls.forEach(b => {
            if (b !== eff.owner && !b.isInvincible) {
              const dist = Math.hypot(b.x - eff.targetX, b.y - eff.targetY);
              if (dist < b.radius + 32) {
                b.stunTimer = 20; 
                const impactDmg = Math.round(10 * getDamageScale());
                b.takeDamage(impactDmg);
                hitTexts.push({ text: `💥 IMPACT -${impactDmg}`, x: b.x, y: b.y - 35, life: 30, color: '#ff2200' });
              }
            }
          });
        }
      } else if (eff.type === 'cherry_blossom_flash') {
        if (eff.life === 15 && !eff.hasAttacked) {
          eff.hasAttacked = true;
          if (eff.target && !eff.target.isInvincible) {
            const flashDmg = Math.round(18 * getDamageScale());
            eff.target.takeDamage(flashDmg);
            eff.target.blindTimer = 120; 
            hitTexts.push({ text: `🌸 BLOSSOM FLASH -${flashDmg}`, x: eff.target.x, y: eff.target.y - 35, life: 40, color: '#ff0055' });
          }
        }
      } else if (eff.type === 'celestial_dragon') {
        if (eff.life === 20 && !eff.hasAttacked) {
          eff.hasAttacked = true;
          if (eff.target && !eff.target.isInvincible) {
            const dragonDmg = Math.round(eff.damage * getDamageScale());
            const tookDmg = eff.target.takeDamage(dragonDmg);
            if (tookDmg) {
              const angle = Math.atan2(eff.target.y - eff.owner.y, eff.target.x - eff.owner.x);
              eff.target.vx += Math.cos(angle) * 28;
              eff.target.vy += Math.sin(angle) * 28;

              triggerShake(20, 12);
              hitTexts.push({ text: `🐉 DRAGON STRIKE -${dragonDmg}`, x: eff.target.x, y: eff.target.y - 30, life: 40, color: '#ffcc00' });
            }
          }
        }
      }

      if (eff.life <= 0) specialEffects.splice(i, 1);
    }
  }

  function drawSpecialEffects() {
    specialEffects.forEach(eff => {
      ctx.save();

      if (eff.type === 'defcon_laser') {
        const alpha = Math.min(1.0, eff.life / 30);
        ctx.strokeStyle = `rgba(255, 30, 0, ${alpha})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(eff.targetX, 0);
        ctx.lineTo(eff.targetX, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(eff.targetX, eff.targetY, 32, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.25})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 50, 50, ${alpha * 0.8})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (eff.type === 'cherry_blossom_flash') {
        const elapsed = eff.maxLife - eff.life;
        const target = eff.target;

        for (let p = 0; p < 8; p++) {
          const px = (target.x + Math.sin(elapsed * 0.1 + p) * 100) % canvas.width;
          const py = (target.y + Math.cos(elapsed * 0.1 + p) * 80) % canvas.height;
          ctx.save();
          ctx.translate(px, py);
          drawCachedEmoji(ctx, '🌸', 22);
          ctx.restore();
        }
      } else if (eff.type === 'celestial_dragon') {
        const elapsed = eff.maxLife - eff.life;
        const progress = elapsed / eff.maxLife;

        ctx.fillStyle = `rgba(255, 30, 0, ${Math.sin(progress * Math.PI) * 0.35})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const target = eff.target;
        const owner = eff.owner;
        const startX = owner.x;
        const startY = owner.y;

        const headX = startX + (target.x - startX) * progress * 1.4;
        const headY = startY + (target.y - startY) * progress * 1.4;

        ctx.lineWidth = 14;
        ctx.strokeStyle = '#ffcc00';

        ctx.beginPath();
        for (let s = 0; s < 12; s++) {
          const segProgress = Math.max(0, progress - s * 0.035);
          const sx = startX + (target.x - startX) * segProgress * 1.4 + Math.sin(segProgress * 16 + s) * 28;
          const sy = startY + (target.y - startY) * segProgress * 1.4 + Math.cos(segProgress * 16 + s) * 28;
          if (s === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();

        ctx.save();
        ctx.translate(headX, headY);
        drawCachedEmoji(ctx, '🐉', 64);
        ctx.restore();
      } else if (eff.type === 'merlion_beam') {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.moveTo(eff.x1, eff.y1);
        ctx.lineTo(eff.x2, eff.y2);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  function start(p1Data, p2Data, callback) {
    onBattleComplete = callback;
    isGameOver = false;
    spawnTimer = 0;
    matchTimer = 0;
    suddenDeathTriggered = false;
    shakeTimer = 0;
    shakeIntensity = 0;
    projectiles = [];
    specialEffects = [];
    hazards = [];
    obstacles = [];
    ghosts = [];
    spiritDaggers = [];

    balls = [
      new Ball(p1Data, canvas.width * 0.28, canvas.height * 0.53, true),
      new Ball(p2Data, canvas.width * 0.72, canvas.height * 0.53, false)
    ];
    items = [];
    airstrikes = [];
    hitTexts = [];

    window.balls = balls;
    window.hitTexts = hitTexts;

    if (animationId) cancelAnimationFrame(animationId);

    triggerIntroBanner();
    loop();
  }

  function checkGameOver() {
    if (isGameOver || isIntroSequence || balls.length < 2) return;

    const loser = balls.find(b => b.hp <= 0 && b.lives <= 0);
    if (loser) {
      isGameOver = true;
      const winner = balls.find(b => b !== loser) || loser;

      triggerShake(20, 10);
      if (window.AudioSystem) {
        AudioSystem.play('ko');
      }

      setTimeout(() => {
        if (onBattleComplete) onBattleComplete(winner);
      }, 700);
    }
  }

  function spawnItems() {
    if (isIntroSequence) return;
    spawnTimer++;

    const matchSec = Math.floor(matchTimer / 60);
    const currentInterval = matchSec >= 60 ? 55 : (matchSec >= 30 ? 80 : 110);

    if (spawnTimer % currentInterval === 0) {
      const rand = Math.random();
      let itemType = 'ENERGY', icon = '⚡';

      if (matchSec < 30) {
        if (rand < 0.50) { itemType = 'ENERGY'; icon = '⚡'; }
        else if (rand < 0.70) { itemType = 'HP'; icon = '💚'; }
        else if (rand < 0.85) { itemType = 'SHIELD'; icon = '🛡️'; }
        else { itemType = 'DASH'; icon = '💨'; }
      } else if (matchSec < 60) {
        if (rand < 0.65) { itemType = 'ENERGY'; icon = '⚡'; }
        else if (rand < 0.80) { itemType = 'HP'; icon = '💚'; }
        else if (rand < 0.88) { itemType = 'SHIELD'; icon = '🛡️'; }
        else { itemType = 'DASH'; icon = '💨'; }
      } else {
        if (rand < 0.80) { itemType = 'ENERGY'; icon = '⚡'; }
        else { itemType = 'DASH'; icon = '💨'; }
      }

      let safeX = 0, safeY = 0, isValid = false, attempts = 0;
      while (!isValid && attempts < 25) {
        attempts++;
        safeX = 40 + Math.random() * (canvas.width - 80);
        safeY = 100 + Math.random() * (canvas.height - 180);
        isValid = balls.every(b => Math.hypot(b.x - safeX, b.y - safeY) > b.radius + 50);
      }

      if (isValid) {
        items.push({ x: safeX, y: safeY, type: itemType, icon: icon, radius: 18 });
      }
    }
  }

  function checkItemCollisions() {
    if (isIntroSequence) return;
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      balls.forEach(ball => {
        const dist = Math.hypot(ball.x - item.x, ball.y - item.y);
        if (dist < ball.radius + item.radius) {
          if (item.type === 'HP') {
            ball.hp = Math.min(ball.maxHp, ball.hp + 20);
            hitTexts.push({ text: '+20 HP', x: ball.x, y: ball.y - 30, life: 30, color: '#05ffa1' });
            if (window.AudioSystem && window.AudioSystem.playFile) {
              window.AudioSystem.playFile('healspawn.mp3');
            }
          } else if (item.type === 'ENERGY') {
            if (ball.silenceTimer > 0) {
              hitTexts.push({ text: '🔇 SILENCED!', x: ball.x, y: ball.y - 30, life: 30, color: '#ff0000' });
            } else if (window.AbilitySystem) {
              window.AbilitySystem.trigger(ball, 'ENERGY');
              hitTexts.push({ text: ball.currentAbilityName || '⚡ ULTIMATE!', x: ball.x, y: ball.y - 30, life: 35, color: '#ffe600' });
            }
          } else if (item.type === 'SHIELD') {
            ball.shieldTimer = 180;
            hitTexts.push({ text: '🛡️ SHIELD!', x: ball.x, y: ball.y - 30, life: 30, color: '#00ffff' });
            if (window.AudioSystem && window.AudioSystem.playFile) {
              window.AudioSystem.playFile('shieldspawn.mp3');
            }
          } else if (item.type === 'DASH') {
            ball.dashTimer = 180;
            hitTexts.push({ text: '💨 DASH!', x: ball.x, y: ball.y - 30, life: 30, color: '#ffaa00' });
            if (window.AudioSystem && window.AudioSystem.playFile) {
              window.AudioSystem.playFile('dashspawn.mp3');
            }
          }
          items.splice(i, 1);
        }
      });
    }
  }

  function checkCollisions() {
    if (balls.length < 2 || isGameOver || isIntroSequence) return;
    const [b1, b2] = balls;

    const dx = b2.x - b1.x;
    const dy = b2.y - b1.y;
    const dist = Math.hypot(dx, dy);
    const minDist = b1.radius + b2.radius;

    if (dist < minDist) {
      const angle = Math.atan2(dy, dx);
      const overlap = minDist - dist;
      b1.x -= Math.cos(angle) * overlap * 0.5;
      b1.y -= Math.sin(angle) * overlap * 0.5;
      b2.x += Math.cos(angle) * overlap * 0.5;
      b2.y += Math.sin(angle) * overlap * 0.5;

      [b1.vx, b2.vx] = [b2.vx, b1.vx];
      [b1.vy, b2.vy] = [b2.vy, b1.vy];

      if (window.AudioSystem) AudioSystem.play('collide');
    }

    checkWeaponHit(b1, b2);
    checkWeaponHit(b2, b1);
  }

  function checkWeaponHit(attacker, defender) {
    if (defender.cooldown > 0 || defender.isInvincible) return;

    for (let i = 0; i < attacker.weaponCount; i++) {
      const curAngle = attacker.weaponAngle + (i * (Math.PI * 2) / attacker.weaponCount);
      const wPos = {
        x: attacker.x + Math.cos(curAngle) * (attacker.weaponOrbitRadius + 20),
        y: attacker.y + Math.sin(curAngle) * (attacker.weaponOrbitRadius + 20)
      };

      const dist = Math.hypot(defender.x - wPos.x, defender.y - wPos.y);

      if (dist < defender.radius + 20) {
        const baseDmg = attacker.config.dmg * (attacker.damageMultiplier || 1.0);
        const isCrit = attacker.hasTriggeredRage;
        let dmg = Math.round((isCrit ? baseDmg * 1.5 : baseDmg) * getDamageScale());

        const tookDmg = defender.takeDamage(dmg);
        if (!tookDmg) return;

        if (attacker.lifesteal && attacker.lifesteal > 0) {
          attacker.hp = Math.min(attacker.maxHp, attacker.hp + (dmg * attacker.lifesteal));
        }

        defender.cooldown = 18;

        if (!defender.zeroKnockbackFlag) {
          const kAngle = Math.atan2(defender.y - wPos.y, defender.x - wPos.x);
          const knockbackForce = isCrit ? 13 : 10;
          defender.vx += Math.cos(kAngle) * knockbackForce;
          defender.vy += Math.sin(kAngle) * knockbackForce;
        }

        if (isCrit) triggerShake(10, 6);

        if (window.AudioSystem && window.AudioSystem.playWeaponSound) {
          window.AudioSystem.playWeaponSound(attacker.config.weapon);
        }

        hitTexts.push({
          text: isCrit ? `CRIT -${dmg}` : `-${dmg}`,
          x: defender.x,
          y: defender.y - 30,
          life: 28,
          color: isCrit ? '#ff0033' : (attacker.isP1 ? '#00f0ff' : '#ff0055')
        });
        break;
      }
    }
  }

  function drawItems() {
    items.forEach(item => {
      ctx.save();
      ctx.translate(item.x, item.y);
      drawCachedEmoji(ctx, item.icon, 26);
      ctx.restore();
    });
  }

  function drawHUD() {
    if (balls.length < 2) return;
    const [b1, b2] = balls;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 12, 20, 0.88)';
    ctx.fillRect(0, 0, canvas.width, 54);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, 53, canvas.width, 1);

    // Symmetric HUD bounds (P1: x=8..148, P2: x=212..352)
    drawBar(8, 26, 140, 18, b1.hp, b1.maxHp, b1.hasTriggeredRage ? '#ff0033' : '#00f0ff', b1.config.name, b1.config.flag, true, b1.lives);
    drawBar(212, 26, 140, 18, b2.hp, b2.maxHp, b2.hasTriggeredRage ? '#ff0033' : '#ff0055', b2.config.name, b2.config.flag, false, b2.lives);

    // Center Timer Badge
    const matchSec = Math.floor(matchTimer / 60);
    ctx.fillStyle = '#121420';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(canvas.width / 2 - 22, 16, 44, 22, 6);
      ctx.fill();
    } else {
      ctx.fillRect(canvas.width / 2 - 22, 16, 44, 22);
    }
    ctx.strokeStyle = matchSec >= 60 ? '#ff0055' : '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 12px Courier New, monospace';
    ctx.fillStyle = matchSec >= 60 ? '#ff0055' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${matchSec}s`, canvas.width / 2, 27);

    ctx.restore();
  }

  function drawBar(x, y, w, h, hp, maxHp, color, name, flag, isLeft, lives = 2) {
    ctx.save();

    // 1. Draw header text with strict clipping region and scale transform
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y - 24, w, 22);
    ctx.clip();

    ctx.font = '900 11px sans-serif';
    ctx.fillStyle = color;
    ctx.textBaseline = 'bottom';

    let hearts = '';
    for (let i = 0; i < lives; i++) hearts += '❤️';

    const flagStr = flag || '';
    const displayName = isLeft 
      ? `${name} ${flagStr} ${hearts}`.trim() 
      : `${hearts} ${flagStr} ${name}`.trim();

    // Measure raw width + safety padding for mobile emoji clusters
    const rawWidth = ctx.measureText(displayName).width;
    const requiredWidth = rawWidth * 1.22;

    if (requiredWidth > w) {
      const scaleFactor = w / requiredWidth;
      ctx.save();
      if (isLeft) {
        ctx.translate(x, y - 3);
        ctx.scale(scaleFactor, scaleFactor);
        ctx.textAlign = 'left';
        ctx.fillText(displayName, 0, 0);
      } else {
        ctx.translate(x + w, y - 3);
        ctx.scale(scaleFactor, scaleFactor);
        ctx.textAlign = 'right';
        ctx.fillText(displayName, 0, 0);
      }
      ctx.restore();
    } else {
      if (isLeft) {
        ctx.textAlign = 'left';
        ctx.fillText(displayName, x, y - 3);
      } else {
        ctx.textAlign = 'right';
        ctx.fillText(displayName, x + w, y - 3);
      }
    }
    ctx.restore();

    // 2. Health Bar rendering
    ctx.fillStyle = '#111625';
    ctx.fillRect(x, y, w, h);

    const fillW = w * Math.max(0, hp / maxHp);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, fillW, h);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.ceil(hp)}/${maxHp}`, x + w / 2, y + h / 2 + 1);

    ctx.restore();
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    if (shakeTimer > 0) {
      shakeTimer--;
      const dx = (Math.random() - 0.5) * shakeIntensity;
      const dy = (Math.random() - 0.5) * shakeIntensity;
      ctx.translate(dx, dy);
    }

    if (!isGameOver && !isIntroSequence) {
      matchTimer++;

      const matchSec = Math.floor(matchTimer / 60);

      if (matchSec >= 60 && !suddenDeathTriggered) {
        suddenDeathTriggered = true;
        triggerCustomBanner('⚡ SUDDEN DEATH: FAST ULTS / EPIC OVERDRIVE! ⚡', 'rgba(180, 0, 0, 0.95)', '#ff0055');
      }

      spawnItems();
      checkItemCollisions();
      updateAirstrikes();
      updateHazards();
      updateObstacles();
      updateGhosts();
      updateKerisDaggers();
      updateProjectiles();
      updateSpecialEffects();
      checkCollisions();
      checkGameOver();
    }

    drawHazards();
    drawAirstrikes();
    drawObstacles();
    drawProjectiles();
    drawGhosts();
    drawKerisDaggers();
    drawSpecialEffects();

    balls.forEach(b => {
      b.update();
      b.draw();
    });

    drawItems();

    for (let i = hitTexts.length - 1; i >= 0; i--) {
      const t = hitTexts[i];
      t.y -= 1.2;
      t.life--;

      ctx.save();
      ctx.font = '900 20px "Impact", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(t.text, t.x, t.y);

      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();

      if (t.life <= 0) hitTexts.splice(i, 1);
    }

    ctx.restore();

    drawHUD();
    drawCanvasFrame();

    animationId = requestAnimationFrame(loop);
  }

  const apiExports = {
    start,
    spawnOrbitingKeris,
    spawnNapalmStrike,
    spawnTeapotSpill,
    spawnSnowVortex,
    triggerCherryBlossomSlash,
    spawnSantetLeech,
    triggerTidalWave,
    triggerNeonCharm,
    spawnHeavyMissile,
    spawnBaguetteWalls,
    spawnBaguetteStorm,
    spawnWallRidingPizza,
    triggerDragonTail,
    spawnMapleBlizzard,
    enableEnergyPlow,
    triggerGhostPunches,
    triggerKneeStrike,
    spawnHiddenTraps,
    spawnRicochetCricketBall,
    spawnCurvingFootball,
    spawnMortarSmoke,
    spawnAirstrike,
    triggerCustomBanner,
    triggerShake
  };

  Object.assign(window, apiExports);

  return apiExports;
})();

window.BattleSystem = BattleSystem;