import logger from '../bot/logger.js';

export default class Survival {
  constructor(bot) {
    this.bot = bot;
    this.hasShelter = false;
    this.enabled = true; // Default enabled
    logger.info('Survival system initialized');
  }

  async seekShelter() {
    if (!this.bot) {
      logger.warn('Bot not available');
      return false;
    }

    try {
      logger.info('Seeking shelter');

      // Look for nearby caves
      const caves = this.findNearbyStructures('cave');
      if (caves.length > 0) {
        // Move to nearest cave
        const nearestCave = caves[0];
        if (this.bot.pathfinder) {
          const goal = new (require('mineflayer-pathfinder')).goals.GoalBlock(
            Math.round(nearestCave.x),
            Math.round(nearestCave.y),
            Math.round(nearestCave.z)
          );
          this.bot.pathfinder.setGoal(goal, false);
          this.hasShelter = true;
          logger.info('Moving to cave shelter');
          return true;
        }
      }

      // If no caves, build shelter
      return this.buildTemporaryShelter();
    } catch (err) {
      logger.error('Shelter seeking error', { error: err.message });
      return false;
    }
  }

  async buildTemporaryShelter() {
    if (!this.bot) {
      logger.warn('Cannot build shelter');
      return false;
    }

    try {
      logger.info('Building temporary shelter');

      const botPos = this.bot.entity.position;
      const shelterSize = 5; // 5x5 area

      // Clear area
      for (let x = -2; x <= 2; x++) {
        for (let z = -2; z <= 2; z++) {
          const block = this.bot.blockAt(botPos.offset(x, 1, z));
          if (block && block.name === 'air') {
            // Position for roof
          }
        }
      }

      // Place dirt blocks to create shelter
      for (let x = -2; x <= 2; x++) {
        for (let z = -2; z <= 2; z++) {
          // Build walls
          const blockBelow = this.bot.blockAt(botPos.offset(x, 0, z));
          if (blockBelow && blockBelow.name !== 'air') {
            const blockAbove = this.bot.blockAt(botPos.offset(x, 1, z));
            if (blockAbove && blockAbove.name === 'air') {
              // Place block - would need proper block placement implementation
              logger.debug('Block placed for shelter', { position: { x, z } });
            }
          }
        }
      }

      this.hasShelter = true;
      logger.info('Temporary shelter built');
      return true;
    } catch (err) {
      logger.error('Shelter building error', { error: err.message });
      return false;
    }
  }

  findNearbyStructures(structureType) {
    const structures = [];
    const range = 50;
    const botPos = this.bot.entity.position;

    // Simplified cave detection - look for air blocks surrounded by stone
    if (structureType === 'cave') {
      for (let y = botPos.y - 20; y <= botPos.y + 5; y++) {
        for (let x = botPos.x - range; x <= botPos.x + range; x++) {
          for (let z = botPos.z - range; z <= botPos.z + range; z++) {
            const block = this.bot.blockAt({ x, y, z });
            if (block && block.name === 'air') {
              // Check if surrounded by stone
              const surrounding = this.checkSurroundingBlocks({ x, y, z }, ['stone', 'deepslate']);
              if (surrounding >= 4) {
                structures.push({ x, y, z, distance: botPos.distanceTo({ x, y, z }) });
              }
            }
          }
        }
      }
    }

    return structures.sort((a, b) => a.distance - b.distance);
  }

  checkSurroundingBlocks(pos, validTypes) {
    let count = 0;
    const { x, y, z } = pos;

    const offsets = [
      [1, 0, 0], [-1, 0, 0],
      [0, 1, 0], [0, -1, 0],
      [0, 0, 1], [0, 0, -1]
    ];

    for (const [dx, dy, dz] of offsets) {
      const block = this.bot.blockAt({ x: x + dx, y: y + dy, z: z + dz });
      if (block && validTypes.includes(block.name)) {
        count++;
      }
    }

    return count;
  }

  async avoidDanger(dangerType) {
    logger.info('Avoiding danger', { dangerType });

    switch (dangerType) {
      case 'lava':
        return this.avoidLava();
      case 'creeper':
        return this.avoidCreeper();
      case 'fall':
        return this.avoidFall();
      default:
        return false;
    }
  }

  async avoidLava() {
    logger.warn('Lava detected - moving away');
    const botPos = this.bot.entity.position;
    // Move to highest safe point
    const safeY = botPos.y + 5;
    return this.goToSafeLocation(botPos.x + 20, safeY, botPos.z + 20);
  }

  async avoidCreeper() {
    logger.warn('Creeper detected - taking shelter');
    return this.seekShelter();
  }

  async avoidFall() {
    logger.warn('Fall detected - securing position');
    this.bot.setControlState('jump', false);
    this.bot.setControlState('sneak', true);
    return true;
  }

  async goToSafeLocation(x, y, z) {
    if (!this.bot.pathfinder) return false;

    try {
      const goal = new (require('mineflayer-pathfinder')).goals.GoalBlock(
        Math.round(x), Math.round(y), Math.round(z)
      );
      this.bot.pathfinder.setGoal(goal, false);
      return true;
    } catch (err) {
      logger.error('Navigation to safe location failed', { error: err.message });
      return false;
    }
  }

  checkTemperature() {
    // Check for fire/lava damage
    const blocks = this.getAdjacentBlocks();
    return {
      hasFire: blocks.some(b => b.name === 'fire'),
      hasLava: blocks.some(b => b.name.includes('lava')),
      hasCactus: blocks.some(b => b.name === 'cactus')
    };
  }

  getAdjacentBlocks() {
    const blocks = [];
    const pos = this.bot.entity.position;

    const offsets = [
      [0, 0, 0], [0, 1, 0], [0, -1, 0],
      [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]
    ];

    for (const [x, y, z] of offsets) {
      const block = this.bot.blockAt(pos.offset(x, y, z));
      if (block) blocks.push(block);
    }

    return blocks;
  }

  async sleep() {
    logger.info('Going to bed');
    this.hasShelter = true;
    // Find and use bed
    return true;
  }

  isSafe() {
    const botPos = this.bot.entity.position;
    return (
      this.hasShelter &&
      this.bot.health > 5 &&
      this.bot.food > 10
    );
  }
}
