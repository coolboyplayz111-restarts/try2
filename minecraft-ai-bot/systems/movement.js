import logger from '../bot/logger.js';

export default class Movement {
  constructor(bot) {
    this.bot = bot;
    this.currentTarget = null;
    this.isMoving = false;
    this.autoMove = false;
    logger.info('Movement system initialized');
  }

  async goTo(x, y, z) {
    if (!this.bot || !this.bot.pathfinder) {
      logger.warn('Pathfinder not available');
      return false;
    }

    this.isMoving = true;
    this.currentTarget = { x, y, z };

    try {
      const goal = new (require('mineflayer-pathfinder')).goals.GoalBlock(Math.round(x), Math.round(y), Math.round(z));
      this.bot.pathfinder.setGoal(goal, false);

      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.bot.pathfinder.isMoving()) {
            clearInterval(checkInterval);
            this.isMoving = false;
            logger.info('Reached destination', { target: this.currentTarget });
            resolve(true);
          }
        }, 100);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkInterval);
          this.isMoving = false;
          logger.warn('Movement timeout');
          resolve(false);
        }, 300000);
      });
    } catch (err) {
      logger.error('Movement error', { error: err.message });
      this.isMoving = false;
      return false;
    }
  }

  async moveTowards(entity, distance = 5) {
    if (!entity || !this.bot.pathfinder) {
      logger.warn('Cannot move towards entity');
      return false;
    }

    return this.goTo(entity.position.x, entity.position.y, entity.position.z);
  }

  stopMovement() {
    if (this.bot.pathfinder) {
      this.bot.pathfinder.setGoal(null);
      this.isMoving = false;
      logger.debug('Movement stopped');
    }
  }

  setAutoMove(enabled = true) {
    this.autoMove = !!enabled;
    logger.info('Auto-move set', { enabled: this.autoMove });
  }

  isAutoMoveEnabled() {
    return !!this.autoMove;
  }

  jump() {
    this.bot.setControlState('jump', true);
    setTimeout(() => {
      this.bot.setControlState('jump', false);
    }, 100);
  }

  turn(angle) {
    const newYaw = this.bot.entity.yaw + angle;
    this.bot.look(newYaw, this.bot.entity.pitch, false);
  }

  sneak(enabled = true) {
    this.bot.setControlState('sneak', enabled);
  }

  getCurrentTarget() {
    return this.currentTarget;
  }

  isMovingToTarget() {
    return this.isMoving;
  }

  getPosition() {
    return this.bot.entity.position.clone();
  }

  getDistance(x, y, z) {
    const pos = this.bot.entity.position;
    return Math.sqrt(
      Math.pow(x - pos.x, 2) +
      Math.pow(y - pos.y, 2) +
      Math.pow(z - pos.z, 2)
    );
  }
}
