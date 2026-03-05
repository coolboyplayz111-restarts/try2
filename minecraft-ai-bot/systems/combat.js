import logger from '../bot/logger.js';

export default class Combat {
  constructor(bot) {
    this.bot = bot;
    this.isInCombat = false;
    this.currentTarget = null;
    this.enabled = true; // Default enabled
    logger.info('Combat system initialized');
  }

  async attack(target) {
    if (!this.enabled) {
      logger.debug('Combat is disabled');
      return false;
    }

    if (!target || !this.bot) {
      logger.warn('Invalid combat target');
      return false;
    }

    this.isInCombat = true;
    this.currentTarget = target;

    try {
      logger.info('Attacking target', { targetType: target.name });

      // Use bot's PvP plugin if available
      if (this.bot.pvp) {
        this.bot.pvp.attack(target);
        
        // Continue attacking for a limited time
        return new Promise((resolve) => {
          const combatTimeout = setTimeout(() => {
            this.stopAttack();
            this.isInCombat = false;
            resolve(true);
          }, 10000); // Attack for up to 10 seconds
        });
      } else {
        // Fallback direct attack
        this.bot.attack(target);
        await this.sleep(500);
        this.bot.attack(target);
        
        this.isInCombat = false;
        return true;
      }
    } catch (err) {
      logger.error('Combat error', { error: err.message });
      this.isInCombat = false;
      return false;
    }
  }

  defendPlayers() {
    // Find nearby players and hostile mobs
    const hostileMobs = Object.values(this.bot.entities).filter(e =>
      e.type === 'mob' &&
      ['creeper', 'skeleton', 'zombie', 'spider'].includes(e.name) &&
      this.bot.entity.position.distanceTo(e.position) < 32
    );

    if (hostileMobs.length > 0) {
      logger.info('Defending against mobs', { count: hostileMobs.length });
      this.attack(hostileMobs[0]);
    }
  }

  stopAttack() {
    if (this.bot.pvp) {
      this.bot.pvp.stop();
    }
    this.isInCombat = false;
    this.currentTarget = null;
    logger.debug('Attack stopped');
  }

  strafe(direction, distance = 3) {
    // Strafe left or right during combat
    const angle = direction === 'left' ? Math.PI / 2 : -Math.PI / 2;
    const newYaw = this.bot.entity.yaw + angle;
    this.bot.look(newYaw, this.bot.entity.pitch, false);
  }

  useShield(active = true) {
    if (this.bot.heldItem && this.bot.heldItem.name === 'shield') {
      this.bot.setControlState('sneak', active);
    }
  }

  useBow() {
    const bow = this.bot.inventory.items().find(item => item.name === 'bow');
    if (bow) {
      this.bot.equip(bow, 'hand');
      this.bot.activateItem();
      return true;
    }
    return false;
  }

  retreat(distance = 20) {
    logger.warn('Retreating from combat');
    const direction = this.bot.entity.yaw;
    const retreatPos = {
      x: this.bot.entity.position.x - Math.cos(direction) * distance,
      y: this.bot.entity.position.y,
      z: this.bot.entity.position.z - Math.sin(direction) * distance
    };
    this.stopAttack();
    return retreatPos;
  }

  getCurrentTarget() {
    return this.currentTarget;
  }

  isInCombatMode() {
    return this.isInCombat;
  }

  async autoCombat(radius = 32) {
    if (!this.enabled) {
      logger.debug('Combat is disabled');
      return false;
    }

    if (!this.bot) {
      logger.warn('Bot not available for combat');
      return false;
    }

    this.isInCombat = true;

    try {
      logger.info('Starting auto-combat', { radius });

      while (this.isInCombat) {
        // Find nearest hostile mob
        const hostileMobs = Object.values(this.bot.entities).filter(e =>
          e.type === 'mob' &&
          ['creeper', 'skeleton', 'zombie', 'spider', 'enderman', 'witch'].includes(e.name) &&
          this.bot.entity.position.distanceTo(e.position) < radius
        );

        if (hostileMobs.length > 0) {
          // Sort by distance
          hostileMobs.sort((a, b) =>
            this.bot.entity.position.distanceTo(a.position) -
            this.bot.entity.position.distanceTo(b.position)
          );

          const target = hostileMobs[0];
          logger.info('Engaging target', { target: target.name, distance: Math.round(this.bot.entity.position.distanceTo(target.position)) });

          // Special handling for creepers
          if (target.name === 'creeper') {
            const retreatPos = await this.defendAgainstCreepers();
            if (retreatPos) {
              // Move away from creeper
              if (this.bot.pathfinder) {
                const goal = new (require('mineflayer-pathfinder')).goals.GoalBlock(
                  Math.round(retreatPos.x),
                  Math.round(retreatPos.y),
                  Math.round(retreatPos.z)
                );
                this.bot.pathfinder.setGoal(goal, false);
                await this.sleep(2000);
              }
              continue;
            }
          }

          // Attack the target
          await this.attack(target);

          // Wait a bit before checking again
          await this.sleep(1000);
        } else {
          // No targets found, exit auto-combat
          logger.info('No hostile mobs found, ending auto-combat');
          this.isInCombat = false;
        }
      }

      return true;
    } catch (err) {
      logger.error('Auto-combat error', { error: err.message });
      this.isInCombat = false;
      return false;
    }
  }

  async defendAgainstCreepers() {
    const creepers = Object.values(this.bot.entities).filter(e =>
      e.name === 'creeper' &&
      this.bot.entity.position.distanceTo(e.position) < 10
    );

    if (creepers.length > 0) {
      // Keep distance from creepers
      const creeper = creepers[0];
      const distance = this.bot.entity.position.distanceTo(creeper.position);
      
      if (distance < 6) {
        // Move away
        const retreatPos = this.retreat(10);
        logger.warn('Creeper nearby - retreating', { distance });
        return retreatPos;
      }
    }
    return null;
  }
}
