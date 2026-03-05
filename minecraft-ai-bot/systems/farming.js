import logger from '../bot/logger.js';

export default class Farming {
  constructor(bot) {
    this.bot = bot;
    this.isFarming = false;
    this.enabled = true; // Default enabled
    logger.info('Farming system initialized');
  }

  async plantCrops(cropType = 'wheat', count = 10) {
    if (!this.enabled) {
      logger.debug('Farming is disabled');
      return false;
    }

    if (!this.bot) {
      logger.warn('Bot not available for farming');
      return false;
    }

    this.isFarming = true;

    try {
      const botPos = this.bot.entity.position;
      let planted = 0;

      logger.info(`Starting farming: ${cropType}`, { count });

      // Find suitable farming area
      for (let x = -20; x <= 20 && planted < count; x++) {
        for (let z = -20; z <= 20 && planted < count; z++) {
          const soil = this.bot.blockAt(botPos.offset(x, 0, z));
          const above = this.bot.blockAt(botPos.offset(x, 1, z));

          // Check if suitable for planting
          if (soil && (soil.name === 'farmland' || soil.name === 'grass_block') && above && above.name === 'air') {
            // Plant the crop
            const seed = this.bot.inventory.items().find(item =>
              item.name === `${cropType}_seeds` || item.name === 'wheat_seeds'
            );

            if (seed) {
              await this.bot.equip(seed, 'hand');
              await this.bot.placeBlock(above, { x: 0, y: 1, z: 0 });
              planted++;
              await this.sleep(300);
            }
          }
        }
      }

      this.isFarming = false;
      logger.info('Farming completed', { planted });
      return true;
    } catch (err) {
      logger.error('Farming error', { error: err.message });
      this.isFarming = false;
      return false;
    }
  }

  async harvestCrops(cropType = 'wheat') {
    if (!this.bot) {
      logger.warn('Bot not available for harvesting');
      return false;
    }

    try {
      const botPos = this.bot.entity.position;
      let harvested = 0;

      logger.info(`Harvesting: ${cropType}`);

      for (let x = -20; x <= 20; x++) {
        for (let z = -20; z <= 20; z++) {
          const block = this.bot.blockAt(botPos.offset(x, 0, z));

          if (block && block.name === cropType && block.metadata >= 7) {
            // Harvest ready crop
            await this.bot.dig(block);
            harvested++;
            await this.sleep(200);
          }
        }
      }

      logger.info('Harvest completed', { harvested });
      return true;
    } catch (err) {
      logger.error('Harvest error', { error: err.message });
      return false;
    }
  }

  async breedAnimals(animalType = 'cow') {
    if (!this.bot) {
      logger.warn('Bot not available for breeding');
      return false;
    }

    try {
      const animals = Object.values(this.bot.entities).filter(e =>
        e.type === 'mob' && e.name === animalType
      );

      logger.info(`Breeding ${animalType}`, { count: animals.length });

      if (animals.length >= 2) {
        const food = this.getAnimalFood(animalType);
        
        for (const animal of animals) {
          const hasFood = this.bot.inventory.items().find(item => item.name === food);
          if (hasFood) {
            await this.bot.equip(hasFood, 'hand');
            // Use food on animal (would need right-click/useOn)
            logger.debug('Fed animal for breeding', { animalType });
          }
        }
      }

      return true;
    } catch (err) {
      logger.error('Breeding error', { error: err.message });
      return false;
    }
  }

  getAnimalFood(animalType) {
    const foods = {
      cow: 'wheat',
      sheep: 'wheat',
      pig: 'carrot',
      chicken: 'wheat_seeds',
      horse: 'golden_carrot',
      wolf: 'bone'
    };
    return foods[animalType] || 'wheat';
  }

  stopFarming() {
    this.isFarming = false;
    logger.debug('Farming stopped');
  }

  isFarmingActive() {
    return this.isFarming;
  }

  async autoTendFarm(radius = 20) {
    if (!this.enabled) {
      logger.debug('Farming is disabled');
      return false;
    }

    if (!this.bot) {
      logger.warn('Bot not available for auto-farming');
      return false;
    }

    this.isFarming = true;

    try {
      const botPos = this.bot.entity.position;
      let harvested = 0;
      let planted = 0;

      logger.info('Auto-tending farm', { radius });

      for (let x = -radius; x <= radius; x++) {
        for (let z = -radius; z <= radius; z++) {
          const block = this.bot.blockAt(botPos.offset(x, 0, z));
          const above = this.bot.blockAt(botPos.offset(x, 1, z));

          if (block && block.name === 'farmland') {
            // Check if crop is ready to harvest
            if (above && (above.name === 'wheat' || above.name === 'carrots' || above.name === 'potatoes') && above.metadata >= 7) {
              await this.bot.dig(above);
              harvested++;
              await this.sleep(200);

              // Replant
              const seed = this.getSeedForCrop(above.name);
              const seedItem = this.bot.inventory.items().find(item => item.name === seed);
              if (seedItem) {
                await this.bot.equip(seedItem, 'hand');
                await this.bot.placeBlock(block, { x: 0, y: 1, z: 0 });
                planted++;
                await this.sleep(300);
              }
            } else if (above && above.name === 'air') {
              // Plant if empty
              const seed = this.bot.inventory.items().find(item => item.name === 'wheat_seeds');
              if (seed) {
                await this.bot.equip(seed, 'hand');
                await this.bot.placeBlock(block, { x: 0, y: 1, z: 0 });
                planted++;
                await this.sleep(300);
              }
            }
          }
        }
      }

      this.isFarming = false;
      logger.info('Auto-farm tending completed', { harvested, planted });
      return { harvested, planted };
    } catch (err) {
      logger.error('Auto-farm error', { error: err.message });
      this.isFarming = false;
      return false;
    }
  }

  getSeedForCrop(cropName) {
    const seeds = {
      wheat: 'wheat_seeds',
      carrots: 'carrot',
      potatoes: 'potato'
    };
    return seeds[cropName] || 'wheat_seeds';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
