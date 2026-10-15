// ==========================================
// PASSIVE.JS - BALANCED PASSIVE ABILITIES WITH AUDIO & CLEAR VISUAL AURAS
// ==========================================

function triggerPassiveSound() {
  if (window.AudioSystem) {
    if (typeof window.AudioSystem.playFile === 'function') {
      window.AudioSystem.playFile('passives.mp3');
    } else if (typeof window.AudioSystem.play === 'function') {
      window.AudioSystem.play('passive');
    }
  }
}

var PassiveSystem = {
  getInterval: function(ball, baseSec, rageSec) {
    const sec = ball.hasTriggeredRage ? rageSec : baseSec;
    return sec * 60;
  },

  // 1. 🇲🇾 MALAYSIA
  SILAT: {
    onDamage: function(ball, amount) {
      if (!ball.passiveTimer) ball.passiveTimer = 0;
      if (ball.passiveTimer <= 0) {
        ball.passiveTimer = PassiveSystem.getInterval(ball, 10, 6);
        ball.dashTimer = 20;
        const healAmount = amount * 0.5;
        ball.hp = Math.min(ball.maxHp, ball.hp + healAmount);
        if (typeof balls !== 'undefined') {
          const enemy = balls.find(b => b !== ball);
          if (enemy) {
            enemy.takeDamage(amount * 0.8);
            const angle = Math.atan2(enemy.y - ball.y, enemy.x - ball.x);
            enemy.vx += Math.cos(angle) * 16;
            enemy.vy += Math.sin(angle) * 16;
          }
        }
        triggerPassiveSound();
        if (typeof hitTexts !== 'undefined') {
          hitTexts.push({ text: `🛡️ PARRY! +${Math.round(healAmount)} HP`, x: ball.x, y: ball.y - 30, life: 40, color: '#ffff00' });
        }
        return true;
      }
      return false;
    },
    onUpdate: function(ball) { if (ball.passiveTimer > 0) ball.passiveTimer--; },
    onDraw: function(ball, ctx) {
      const isReady = !ball.passiveTimer || ball.passiveTimer <= 0;
      ctx.save();
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = isReady ? 'rgba(255, 255, 0, 0.95)' : 'rgba(255, 255, 0, 0.25)';
      ctx.lineWidth = isReady ? 3.5 : 1.5;
      ctx.stroke();
      ctx.restore();
    },
    onEnemyUlt: function(ball, enemyBall) {}
  },

  // 2. 🇰🇷 SOUTH KOREA
  TURTLE_SHIP: {
    onEnemyUlt: function(ball, enemyBall) {
      ball.turtleShellTimer = 60;
      triggerPassiveSound();
      if (typeof hitTexts !== 'undefined') {
        hitTexts.push({ text: '🛡️ IRONCLAD SHELL!', x: ball.x, y: ball.y - 45, life: 50, color: '#00ffff' });
      }
    },
    onDamage: function(ball, amount) {
      if (!ball.passiveTimer) ball.passiveTimer = 0;
      if (ball.turtleShellTimer > 0 || ball.passiveTimer <= 0) {
        if (ball.passiveTimer <= 0) {
          ball.passiveTimer = PassiveSystem.getInterval(ball, 11, 7);
          ball.turtleShellTimer = 60;
          triggerPassiveSound();
        }
        if (typeof balls !== 'undefined') {
          const enemy = balls.find(b => b !== ball);
          if (enemy) enemy.takeDamage(amount * 0.5);
        }
        ball.hp -= (amount * 0.5);
        return true;
      }
      return false;
    },
    onUpdate: function(ball) {
      if (ball.passiveTimer > 0) ball.passiveTimer--;
      if (ball.turtleShellTimer > 0) ball.turtleShellTimer--;
    },
    onDraw: function(ball, ctx) {
      if (ball.turtleShellTimer > 0) {
        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const px = Math.cos(angle) * (ball.radius + 18);
          const py = Math.sin(angle) * (ball.radius + 18);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ff3333';
        ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  },

  // 3. 🇷🇺 RUSSIA
  WINTER: {
    onDamage: function(ball, amount) { return false; },
    onUpdate: function(ball) {
      if (!ball.passiveTimer) ball.passiveTimer = PassiveSystem.getInterval(ball, 8, 5);
      ball.passiveTimer--;
      if (typeof balls !== 'undefined') {
        balls.forEach(enemy => {
          if (enemy !== ball) {
            const dist = Math.hypot(ball.x - enemy.x, ball.y - enemy.y);
            if (dist < 180) {
              enemy.targetSpeedMultiplier = 0.7;
            } else if (enemy.targetSpeedMultiplier === 0.7) {
              enemy.targetSpeedMultiplier = 1.0;
            }
            if (ball.passiveTimer <= 0 && dist < 180) {
              enemy.takeDamage(10);
              enemy.stunTimer = 48;
              triggerPassiveSound();
              if (typeof hitTexts !== 'undefined') {
                hitTexts.push({ text: '❄️ FROST PULSE -10', x: enemy.x, y: enemy.y - 30, life: 40, color: '#99ddff' });
              }
            }
          }
        });
      }
      if (ball.passiveTimer <= 0) ball.passiveTimer = PassiveSystem.getInterval(ball, 8, 5);
    },
    onDraw: function(ball, ctx) {
      const isPulseReady = ball.passiveTimer <= 30;
      ctx.save();
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 180, 0, Math.PI * 2);
      ctx.fillStyle = isPulseReady ? 'rgba(0, 200, 255, 0.22)' : 'rgba(150, 220, 255, 0.12)';
      ctx.fill();
      ctx.strokeStyle = isPulseReady ? '#00f0ff' : 'rgba(0, 200, 255, 0.6)';
      ctx.lineWidth = isPulseReady ? 3 : 2;
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.restore();
    },
    onEnemyUlt: function(ball, enemyBall) {}
  },

  // 4. 🇺🇸 USA
  DEFENSE_BUDGET: {
    onDamage: function(ball, amount) {
      if (ball.milStacks && ball.milStacks > 0) {
        ball.milStacks--;
        ball.hp -= (amount * 0.6);
        triggerPassiveSound();
        if (typeof hitTexts !== 'undefined') {
          hitTexts.push({ text: '💵 FUNDING BLOCK -40%', x: ball.x, y: ball.y - 30, life: 30, color: '#00ff00' });
        }
        return true;
      }
      return false;
    },
    onUpdate: function(ball) {
      if (!ball.passiveTimer) ball.passiveTimer = 0;
      if (ball.milStacks === undefined) ball.milStacks = 0;
      ball.passiveTimer++;
      const interval = PassiveSystem.getInterval(ball, 8, 5);
      if (ball.passiveTimer >= interval && ball.milStacks < 3) {
        ball.passiveTimer = 0;
        ball.milStacks++;
      }
      ball.targetSpeedMultiplier = 1.0 + (ball.milStacks * 0.03);
      ball.damageMultiplier = 1.0 + (ball.milStacks * 0.05);
    },
    onDraw: function(ball, ctx) {
      if (ball.milStacks > 0) {
        ctx.save();
        for (let i = 0; i < ball.milStacks; i++) {
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(ball.x - 15 + (i * 12), ball.y - ball.radius - 14, 8, 8);
        }
        ctx.restore();
      }
    },
    onEnemyUlt: function(ball, enemyBall) {}
  },

  // 5. 🇧🇷 BRAZIL
  CAPOEIRA: {
    onDamage: function(ball, amount) {
      if (ball.rhythm >= 100 && Math.random() < 0.25) {
        triggerPassiveSound();
        if (typeof hitTexts !== 'undefined') {
          hitTexts.push({ text: '💨 SAMBA DODGE!', x: ball.x, y: ball.y - 30, life: 30, color: '#00ff55' });
        }
        return true;
      }
      return false;
    },
    onUpdate: function(ball) {
      if (ball.rhythm === undefined) ball.rhythm = 0;
      if (Math.hypot(ball.vx, ball.vy) > 1) {
        ball.rhythm = Math.min(100, ball.rhythm + 0.35);
      } else {
        ball.rhythm = Math.max(0, ball.rhythm - 0.5);
      }
      ball.targetSpeedMultiplier = ball.rhythm >= 100 ? 1.25 : 1.0;
    },
    onDraw: function(ball, ctx) {
      if (ball.rhythm > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(ball.x - 20, ball.y + ball.radius + 8, 40, 6);
        ctx.fillStyle = ball.rhythm >= 100 ? '#00ff55' : '#ffdf00';
        ctx.fillRect(ball.x - 20, ball.y + ball.radius + 8, (ball.rhythm / 100) * 40, 6);
        ctx.restore();
      }
    },
    onEnemyUlt: function(ball, enemyBall) {}
  },

  // 6. 🇨🇦 CANADA
  HEALTHCARE: {
    onDamage: function(ball, amount) {
      ball.noDamageTimer = 0;
      if (ball.hp / ball.maxHp <= 0.25 && !ball.usedTriage) {
        ball.usedTriage = true;
        ball.triageHeal = 120;
        ball.shieldTimer = 30;
        triggerPassiveSound();
        if (typeof hitTexts !== 'undefined') {
          hitTexts.push({ text: '🏥 EMERGENCY TRIAGE!', x: ball.x, y: ball.y - 35, life: 40, color: '#ff3333' });
        }
      }
      return false;
    },
    onUpdate: function(ball) {
      if (!ball.noDamageTimer) ball.noDamageTimer = 0;
      ball.noDamageTimer++;
      let regenRate = ball.noDamageTimer > 240 ? 0.015 : 0.01;
      if (ball.triageHeal > 0) {
        ball.triageHeal--;
        regenRate += (ball.maxHp * 0.15) / 120;
      }
      if (ball.hp < ball.maxHp) ball.hp = Math.min(ball.maxHp, ball.hp + regenRate);
    },
    onDraw: function(ball, ctx) {},
    onEnemyUlt: function(ball, enemyBall) {}
  },

  // 7. 🇨🇳 CHINA
  GREAT_WALL: {
    onDamage: function(ball, amount) {
      if (ball.wallFragments && ball.wallFragments > 0) {
        ball.wallFragments--;
        triggerPassiveSound();
        if (typeof hitTexts !== 'undefined') {
          hitTexts.push({ text: '🧱 WALL BLOCK', x: ball.x, y: ball.y - 30, life: 30, color: '#c4a47c' });
        }
        return true;
      }
      return false;
    },
    onUpdate: function(ball) {
      if (ball.wallFragments === undefined) ball.wallFragments = 3;
      if (!ball.passiveTimer) ball.passiveTimer = 0;
      if (ball.wallFragments < 3) {
        ball.passiveTimer++;
        const interval = PassiveSystem.getInterval(ball, 9, 5);
        if (ball.passiveTimer >= interval) {
          ball.wallFragments++;
          ball.passiveTimer = 0;
        }
      }
    },
    onDraw: function(ball, ctx) {
      if (ball.wallFragments > 0) {
        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.rotate(Date.now() * 0.002);
        ctx.strokeStyle = '#c4a47c';
        ctx.lineWidth = 4;
        for (let i = 0; i < ball.wallFragments; i++) {
          ctx.beginPath();
          ctx.arc(0, 0, ball.radius + 14, (i * Math.PI * 2 / 3), (i * Math.PI * 2 / 3) + 1.2);
          ctx.stroke();
        }
        ctx.restore();
      }
    },
    onEnemyUlt: function(ball, enemyBall) {}
  },

  // 8. 🇫🇷 FRANCE
  RESISTANCE: {
    onDamage: function(ball, amount) { return false; },
    onUpdate: function(ball) {
      if (ball.hp / ball.maxHp <= 0.35) {
        ball.targetSpeedMultiplier = 1.25;
        if (ball.cooldown > 0) ball.cooldown -= 0.25;
        ball.stunTimer = 0;
        ball.lifesteal = 0.25;
      } else {
        ball.targetSpeedMultiplier = 1.0;
        ball.lifesteal = 0;
      }
    },
    onDraw: function(ball, ctx) {
      if (ball.hp / ball.maxHp <= 0.35) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#0055a5';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }
    },
    onEnemyUlt: function(ball, enemyBall) {}
  },

  // 9. 🇩🇪 GERMANY
  AUTOBAHN: {
    onDamage: function(ball, amount) { return false; },
    onUpdate: function(ball) {
      if (!ball.lastAngle) ball.lastAngle = Math.atan2(ball.vy, ball.vx);
      const currentAngle = Math.atan2(ball.vy, ball.vx);
      const turnDelta = Math.abs(currentAngle - ball.lastAngle);
      if (turnDelta < 0.12 && Math.hypot(ball.vx, ball.vy) > 1) {
        ball.targetSpeedMultiplier = Math.min(1.4, ball.targetSpeedMultiplier + 0.003);
      } else {
        ball.targetSpeedMultiplier = Math.max(1.0, ball.targetSpeedMultiplier - 0.04);
      }
      ball.damageMultiplier = ball.targetSpeedMultiplier >= 1.35 ? 1.35 : 1.0;
      ball.lastAngle = currentAngle;
    },
    onDraw: function(ball, ctx) {
      if (ball.targetSpeedMultiplier >= 1.35) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    },
    onEnemyUlt: function(ball, enemyBall) {}
  },

  // 10. 🇮🇳 INDIA
  YOGA: {
    onDamage: function(ball, amount) { return false; },
    onUpdate: function(ball) {
      if (!ball.passiveTimer) ball.passiveTimer = 0;
      ball.passiveTimer++;
      const interval = PassiveSystem.getInterval(ball, 8, 5);
      if (ball.passiveTimer >= interval) {
        ball.passiveTimer = 0;
        ball.stunTimer = 0;
        ball.silenceTimer = 0;
        ball.shieldTimer = 30;
        ball.hp = Math.min(ball.maxHp, ball.hp + (ball.maxHp * 0.08));
        triggerPassiveSound();
        if (typeof hitTexts !== 'undefined') {
          hitTexts.push({ text: '🧘 CHAKRA HEAL +8%', x: ball.x, y: ball.y - 30, life: 30, color: '#000080' });
        }
      }
    },
    onDraw: function(ball, ctx) {},
    onEnemyUlt: function(ball, enemyBall) {}
  },

  // 11. 🇮🇩 INDONESIA
  RING_OF_FIRE: {
    onDamage: function(ball, amount) {
      if (!ball.passiveTimer) ball.passiveTimer = 0;
      if (ball.passiveTimer <= 0) {
        ball.passiveTimer = PassiveSystem.getInterval(ball, 12, 7);
        if (typeof balls !== 'undefined') {
          const enemy = balls.find(b => b !== ball);
          if (enemy) {
            enemy.takeDamage(amount);
            enemy.poisonTimer = 120;
            const angle = Math.atan2(enemy.y - ball.y, enemy.x - ball.x);
            enemy.vx += Math.cos(angle) * 18;
            enemy.vy += Math.sin(angle) * 18;
          }
        }
        triggerPassiveSound();
        if (typeof hitTexts !== 'undefined') {
          hitTexts.push({ text: '🛡️ BATIK REFLECT!', x: ball.x, y: ball.y - 30, life: 35, color: '#d800ff' });
        }
        return true;
      }
      return false;
    },
    onUpdate: function(ball) { if (ball.passiveTimer > 0) ball.passiveTimer--; },
    onDraw: function(ball, ctx) {
      const isReady = !ball.passiveTimer || ball.passiveTimer <= 0;
      ctx.save();
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = isReady ? '#d800ff' : 'rgba(216, 0, 255, 0.25)';
      ctx.lineWidth = isReady ? 3.5 : 1.5;
      ctx.stroke();
      ctx.restore();
    },
    onEnemyUlt: function(ball, enemyBall) {}
  },

  // 12. 🇮🇹 ITALY
  RENAISSANCE: {
    onDamage: function(ball, amount) { return false; },
    onUpdate: function(ball) {
      if (ball.inspiration === undefined) ball.inspiration = 0;
      if (Math.hypot(ball.vx, ball.vy) > 1.5) ball.inspiration += 0.12;
      if (ball.inspiration >= 100) {
        ball.inspiration = 0;
        if (ball.cooldown > 0) ball.cooldown *= 0.8;
        ball.dashTimer = 30;
        ball.hp = Math.min(ball.maxHp, ball.hp + 12);
        triggerPassiveSound();
        if (typeof hitTexts !== 'undefined') {
          hitTexts.push({ text: '🎨 MASTERPIECE!', x: ball.x, y: ball.y - 30, life: 30, color: '#009246' });
        }
      }
    },
    onDraw: function(ball, ctx) {},
    onEnemyUlt: function(ball, enemyBall) {}
  },

  // 13. 🇯🇵 JAPAN
  NINJUTSU: {
    onDamage: function(ball, amount) {
      if (!ball.passiveTimer) ball.passiveTimer = 0;
      if (ball.passiveTimer <= 0) {
        ball.passiveTimer = PassiveSystem.getInterval(ball, 10, 6);
        ball.invisibleTimer = 90;
        ball.stealthCritReady = 120;
        ball.kawarimiDecoy = { x: ball.x, y: ball.y, timer: 60 };
        const angle = Math.random() * Math.PI * 2;
        ball.x += Math.cos(angle) * 80;
        ball.y += Math.sin(angle) * 80;
        triggerPassiveSound();
        if (typeof hitTexts !== 'undefined') {
          hitTexts.push({ text: '🪵 KAWARIMI DECOY!', x: ball.x, y: ball.y - 30, life: 40, color: '#8b5a2b' });
        }
        return true;
      }
      return false;
    },
    onUpdate: function(ball) {
      if (ball.passiveTimer > 0) ball.passiveTimer--;
      if (ball.stealthCritReady > 0) {
        ball.stealthCritReady--;
        ball.damageMultiplier = 1.4;
      } else if (!ball.milStacks) {
        ball.damageMultiplier = 1.0;
      }
      if (ball.kawarimiDecoy && ball.kawarimiDecoy.timer > 0) ball.kawarimiDecoy.timer--;
    },
    onDraw: function(ball, ctx) {
      if (ball.kawarimiDecoy && ball.kawarimiDecoy.timer > 0) {
        ctx.save();
        ctx.font = `${ball.radius * 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = ball.kawarimiDecoy.timer / 60;
        ctx.fillText('🪵', ball.kawarimiDecoy.x, ball.kawarimiDecoy.y);
        ctx.restore();
      }
    },
    onEnemyUlt: function(ball, enemyBall) {}
  },

  // 14. 🇰🇵 NORTH KOREA
  ISOLATION: {
    onDamage: function(ball, amount) {
      if (ball.hp / ball.maxHp <= 0.25 && !ball.madTriggered) {
        ball.madTriggered = true;
        ball.shieldTimer = 90;
        triggerPassiveSound();
        if (typeof balls !== 'undefined') {
          const enemy = balls.find(b => b !== ball);
          if (enemy) {
            enemy.takeDamage(40);
            enemy.poisonTimer = 180;
            if (typeof hitTexts !== 'undefined') {
              hitTexts.push({ text: '☢️ M.A.D. DETONATION -40', x: ball.x, y: ball.y - 45, life: 60, color: '#33ff33' });
            }
          }
        }
      }
      return false;
    },
    onUpdate: function(ball) {
      if (typeof balls !== 'undefined') {
        balls.forEach(enemy => {
          if (enemy !== ball && enemy.poisonTimer > 0) {
            enemy.poisonTimer--;
            if (enemy.poisonTimer % 10 === 0) enemy.takeDamage(1.0);
          }
        });
      }
    },
    onDraw: function(ball, ctx) {},
    onEnemyUlt: function(ball, enemyBall) {}
  },

  // 15. 🇵🇭 PHILIPPINES
  TYPHOON: {
    onDamage: function(ball, amount) {
      if (ball.windBarrier > 0) {
        triggerPassiveSound();
        if (typeof hitTexts !== 'undefined') {
          hitTexts.push({ text: '💨 WIND DODGE!', x: ball.x, y: ball.y - 30, life: 30, color: '#00ffff' });
        }
        return true;
      }
      return false;
    },
    onUpdate: function(ball) {
      if (!ball.passiveTimer) ball.passiveTimer = 0;
      if (ball.windBarrier === undefined) ball.windBarrier = 0;
      ball.passiveTimer++;
      if (ball.windBarrier > 0) ball.windBarrier--;
      const interval = PassiveSystem.getInterval(ball, 7, 4);
      if (ball.passiveTimer >= interval) {
        ball.passiveTimer = 0;
        ball.dashTimer = 30;
        ball.windBarrier = 60;
        if (typeof balls !== 'undefined') {
          const enemy = balls.find(b => b !== ball);
          if (enemy) {
            const angle = Math.atan2(enemy.y - ball.y, enemy.x - ball.x);
            enemy.vx += Math.cos(angle) * 16;
            enemy.vy += Math.sin(angle) * 16;
            enemy.takeDamage(8);
            triggerPassiveSound();
            if (typeof hitTexts !== 'undefined') {
              hitTexts.push({ text: '🌀 TYPHOON SURGE -8', x: enemy.x, y: enemy.y - 30, life: 35, color: '#00ffff' });
            }
          }
        }
      }
    },
    onDraw: function(ball, ctx) {
      if (ball.windBarrier > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius + 12, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }
    },
    onEnemyUlt: function(ball, enemyBall) {}
  },

  // 16. 🇸🇬 SINGAPORE
  FINE_CITY: {
    onDamage: function(ball, amount) { return false; },
    onUpdate: function(ball) {
      if (!ball.passiveTimer) ball.passiveTimer = 0;
      ball.passiveTimer++;
      const interval = PassiveSystem.getInterval(ball, 9, 5);
      if (ball.passiveTimer >= interval) {
        ball.passiveTimer = 0;
        if (typeof balls !== 'undefined') {
          balls.forEach(enemy => {
            if (enemy !== ball) {
              enemy.dashTimer = 0;
              enemy.shieldTimer = 0;
              enemy.silenceTimer = 60;
              enemy.takeDamage(8);
              ball.hp = Math.min(ball.maxHp, ball.hp + 8);
              triggerPassiveSound();
              if (typeof hitTexts !== 'undefined') {
                hitTexts.push({ text: '🚫 FINED & SILENCED!', x: enemy.x, y: enemy.y - 30, life: 40, color: '#ff0000' });
              }
            }
          });
        }
      }
    },
    onDraw: function(ball, ctx) {},
    onEnemyUlt: function(ball, enemyBall) {}
  },

  // 17. 🇹🇭 THAILAND
  CLINCH: {
    onDamage: function(ball, amount) {
      if (ball.passiveTimer <= 0) {
        ball.hp -= (amount * 0.5);
        return true;
      }
      return false;
    },
    onUpdate: function(ball) {
      if (ball.passiveTimer === undefined) ball.passiveTimer = 0;
      if (ball.passiveTimer > 0) ball.passiveTimer--;

      if (ball.passiveTimer <= 0 && typeof balls !== 'undefined') {
        const enemy = balls.find(b => b !== ball);
        if (enemy) {
          const dist = Math.hypot(ball.x - enemy.x, ball.y - enemy.y);
          if (dist < 140) {
            ball.passiveTimer = PassiveSystem.getInterval(ball, 8, 5);

            const angle = Math.atan2(enemy.y - ball.y, enemy.x - ball.x);
            ball.vx += Math.cos(angle) * 10;
            ball.vy += Math.sin(angle) * 10;

            const damage = ball.hasTriggeredRage ? 5 : 3;
            enemy.takeDamage(damage);

            enemy.stunTimer = 120;

            enemy.vx += Math.cos(angle) * 14;
            enemy.vy += Math.sin(angle) * 14;

            triggerPassiveSound();

            if (typeof hitTexts !== 'undefined') {
              hitTexts.push({
                text: `💫 LONG CLINCH STUN! -${damage}`,
                x: enemy.x,
                y: enemy.y - 35,
                life: 50,
                color: '#a51931'
              });
            }

            if (window.BattleSystem && window.BattleSystem.triggerShake) {
              window.BattleSystem.triggerShake(12, 6);
            }
          }
        }
      }
    },
    onDraw: function(ball, ctx) {
      const isReady = !ball.passiveTimer || ball.passiveTimer <= 0;
      ctx.save();
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 140, 0, Math.PI * 2);
      ctx.fillStyle = isReady ? 'rgba(165, 25, 49, 0.12)' : 'rgba(165, 25, 49, 0.03)';
      ctx.fill();
      ctx.strokeStyle = isReady ? 'rgba(255, 50, 80, 0.85)' : 'rgba(165, 25, 49, 0.25)';
      ctx.lineWidth = isReady ? 2.5 : 1.2;
      ctx.setLineDash(isReady ? [8, 6] : [4, 8]);
      ctx.stroke();
      ctx.restore();
    },
    onEnemyUlt: function(ball, enemyBall) {}
  },

  // 18. 🇹🇷 TURKEY
  BOSPHORUS: {
    onDamage: function(ball, amount) { return false; },
    onUpdate: function(ball) {
      if (!ball.passiveTimer) ball.passiveTimer = 0;
      if (ball.passiveTimer > 0) ball.passiveTimer--;
      if (ball.passiveTimer <= 0 && typeof balls !== 'undefined') {
        const enemy = balls.find(b => b !== ball);
        if (enemy) {
          if (!enemy.lastSideX) enemy.lastSideX = Math.sign(enemy.x - ball.x);
          const currentSideX = Math.sign(enemy.x - ball.x);
          if (currentSideX !== enemy.lastSideX && enemy.lastSideX !== 0) {
            ball.passiveTimer = PassiveSystem.getInterval(ball, 9, 5);
            enemy.takeDamage(10);
            ball.hp = Math.min(ball.maxHp, ball.hp + 10);
            enemy.targetSpeedMultiplier = 0.6;
            setTimeout(() => enemy.targetSpeedMultiplier = 1.0, 2000);
            triggerPassiveSound();
            if (typeof hitTexts !== 'undefined') {
              hitTexts.push({ text: '🪙 TOLL TAXED -10', x: enemy.x, y: enemy.y - 30, life: 35, color: '#ffaa00' });
            }
          }
          enemy.lastSideX = currentSideX;
        }
      }
    },
    onDraw: function(ball, ctx) {},
    onEnemyUlt: function(ball, enemyBall) {}
  },

  // 19. 🇬🇧 UK
  ISLAND: {
    onDamage: function(ball, amount) {
      if (!ball.passiveTimer) ball.passiveTimer = 0;
      if (ball.passiveTimer <= 0) {
        ball.passiveTimer = PassiveSystem.getInterval(ball, 9, 5);
        ball.zeroKnockbackFlag = true;
        ball.hp = Math.min(ball.maxHp, ball.hp + 10);
        if (typeof balls !== 'undefined') {
          const enemy = balls.find(b => b !== ball);
          if (enemy) {
            enemy.takeDamage(18);
            const angle = Math.atan2(enemy.y - ball.y, enemy.x - ball.x);
            enemy.vx += Math.cos(angle) * 20;
            enemy.vy += Math.sin(angle) * 20;
          }
        }
        triggerPassiveSound();
        if (typeof hitTexts !== 'undefined') {
          hitTexts.push({ text: '🔱 GUARD COUNTER!', x: ball.x, y: ball.y - 40, life: 40, color: '#ffaaaa' });
        }
        return true;
      }
      return false;
    },
    onUpdate: function(ball) {
      if (ball.passiveTimer > 0) ball.passiveTimer--;
      ball.zeroKnockbackFlag = false;
    },
    onDraw: function(ball, ctx) {
      const isReady = !ball.passiveTimer || ball.passiveTimer <= 0;
      if (isReady) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, ball.y - ball.radius - 8, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    },
    onEnemyUlt: function(ball, enemyBall) {}
  },

  // 20. 🇻🇳 VIETNAM
  GUERRILLA: {
    onDamage: function(ball, amount) {
      if (ball.invisibleTimer > 0) {
        triggerPassiveSound();
        if (typeof hitTexts !== 'undefined') {
          hitTexts.push({ text: '👻 PHANTOM DODGE', x: ball.x, y: ball.y - 30, life: 30, color: '#aaaaaa' });
        }
        return true;
      }
      return false;
    },
    onUpdate: function(ball) {
      if (!ball.passiveTimer) ball.passiveTimer = 0;
      ball.passiveTimer++;
      const interval = PassiveSystem.getInterval(ball, 7, 4);
      if (ball.passiveTimer >= interval) {
        ball.passiveTimer = 0;
        ball.invisibleTimer = 90;
        ball.stealthCritReady = true;
      }
      if (ball.stealthCritReady) {
        ball.damageMultiplier = 1.5;
      } else if (!ball.milStacks) {
        ball.damageMultiplier = 1.0;
      }
    },
    onDraw: function(ball, ctx) {},
    onEnemyUlt: function(ball, enemyBall) {}
  },

  // Fallback
  NONE: {
    onDamage: function(ball, amount) { return false; },
    onUpdate: function(ball) {},
    onDraw: function(ball, ctx) {},
    onEnemyUlt: function(ball, enemyBall) {}
  }
};

window.PassiveSystem = PassiveSystem;