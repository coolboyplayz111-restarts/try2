import logger from '../bot/logger.js';
import config from '../bot/config.js';

export default class Perception {
  constructor(bot) {
    this.bot = bot;
    this.lastPerception = null;
    logger.info('Perception system initialized');
  }

  async perceive() {
    if (!this.bot || !this.bot.entity) return null;

    const perception = {
      timestamp: Date.now(),
      position: this.bot.entity.position.clone(),
      health: this.bot.health,
      hunger: this.bot.food,
      saturation: this.bot.foodSaturation,
      xp: this.bot.experience.level,
      dimension: this.bot.game.dimension,
      difficulty: this.bot.game.difficulty,
      gameMode: this.bot.game.gameMode,
      players: this.detectPlayers(),
      hostileMobs: this.detectHostileMobs(),
      passiveMobs: this.detectPassiveMobs(),
      items: this.detectItems(),
      ores: this.detectOres(),
      blocks: this.detectBlocks(),
      isNight: this.bot.world && (this.bot.world.time.timeOfDay > 12500 || this.bot.world.time.timeOfDay < 23500),
      isRaining: this.bot.isRaining
    };

    this.lastPerception = perception;
    return perception;
  }

  detectPlayers() {
    const players = [];
    const entities = this.bot.nearestEntity(entity => entity.type === 'player');
    
    if (entities) {
      for (const player of this.bot.players.values()) {
        if (!player.entity) continue;
        const distance = this.bot.entity.position.distanceTo(player.entity.position);
        if (distance <= config.ai.perceptionRange) {
          players.push({
            name: player.username,
            uuid: player.uuid,
            position: player.entity.position.clone(),
            health: player.entity.metadata[8],
            distance
          });
        }
      }
    }
    return players;
  }

  detectHostileMobs() {
    const hostileMobs = [];
    const types = ['creeper', 'skeleton', 'zombie', 'enderman', 'spider', 'witch', 'wither'];

    for (const type of types) {
      const mob = this.bot.nearestEntity(entity => {
        return entity.type === 'mob' &&
          entity.name === type &&
          this.bot.entity.position.distanceTo(entity.position) <= config.ai.perceptionRange;
      });

      if (mob) {
        hostileMobs.push({
          type: mob.name,
          id: mob.id,
          position: mob.position.clone(),
          health: mob.metadata[8],
          distance: this.bot.entity.position.distanceTo(mob.position)
        });
      }
    }

    return hostileMobs.sort((a, b) => a.distance - b.distance);
  }

  detectPassiveMobs() {
    const passiveMobs = [];
    const types = ['pig', 'cow', 'sheep', 'horse', 'chicken', 'wolf', 'cat'];

    for (const type of types) {
      const mob = this.bot.nearestEntity(entity => {
        return entity.type === 'mob' &&
          entity.name === type &&
          this.bot.entity.position.distanceTo(entity.position) <= config.ai.perceptionRange;
      });

      if (mob) {
        passiveMobs.push({
          type: mob.name,
          id: mob.id,
          position: mob.position.clone(),
          health: mob.metadata[8],
          distance: this.bot.entity.position.distanceTo(mob.position)
        });
      }
    }

    return passiveMobs;
  }

  detectItems() {
    const items = [];
    const entities = Object.values(this.bot.entities).filter(e => {
      return e.type === 'object' &&
        this.bot.entity.position.distanceTo(e.position) <= config.ai.perceptionRange;
    });

    for (const item of entities) {
      items.push({
        id: item.id,
        name: item.metadata[8]?.text || 'unknown',
        position: item.position.clone(),
        distance: this.bot.entity.position.distanceTo(item.position)
      });
    }

    return items.sort((a, b) => a.distance - b.distance);
  }

  detectOres() {
    const ores = [];
    const oreTypes = ['coal', 'iron', 'gold', 'diamond', 'redstone', 'lapis'];
    const range = config.ai.perceptionRange;
    const pos = this.bot.entity.position;

    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        for (let dz = -range; dz <= range; dz++) {
          const block = this.bot.blockAt(pos.offset(dx, dy, dz));
          if (block && oreTypes.includes(block.name)) {
            ores.push({
              type: block.name,
              position: block.position.clone(),
              distance: pos.distanceTo(block.position)
            });
          }
        }
      }
    }

    return ores.sort((a, b) => a.distance - b.distance).slice(0, 20);
  }

  detectBlocks() {
    const blocks = {
      chests: [],
      furnaces: [],
      lava: [],
      water: [],
      caves: [],
      crops: [] // detect harvestable crops
    };

    const range = config.ai.perceptionRange;
    const pos = this.bot.entity.position;

    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        for (let dz = -range; dz <= range; dz++) {
          const block = this.bot.blockAt(pos.offset(dx, dy, dz));
          if (!block) continue;

          if (block.name === 'chest' || block.name === 'trapped_chest') {
            blocks.chests.push({ position: block.position.clone() });
          } else if (block.name === 'furnace' || block.name === 'blast_furnace') {
            blocks.furnaces.push({ position: block.position.clone() });
          } else if (block.name === 'lava' || block.name === 'flowing_lava') {
            blocks.lava.push({ position: block.position.clone() });
          } else if (block.name === 'water' || block.name === 'flowing_water') {
            blocks.water.push({ position: block.position.clone() });
          }

          // detect crops that are fully grown
          const cropTypes = ['wheat', 'carrots', 'potatoes', 'beetroots', 'nether_wart'];
          if (cropTypes.includes(block.name) && block.metadata >= 7) {
            blocks.crops.push({ name: block.name, position: block.position.clone(), metadata: block.metadata });
          }
        }
      }
    }

    return blocks;
  }

  getLastPerception() {
    return this.lastPerception;
  }
}
