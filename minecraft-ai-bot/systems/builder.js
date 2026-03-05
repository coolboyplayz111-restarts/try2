import logger from '../bot/logger.js';
import fs from 'fs';
import path from 'path';

export default class Builder {
  constructor(bot) {
    this.bot = bot;
    this.isBuilding = false;
    this.currentStructure = null;
    this.structures = {
      starterHouse: [
        { dx: 0, dy: 0, dz: 0, block: 'oak_planks' },
        { dx: 1, dy: 0, dz: 0, block: 'oak_planks' },
        { dx: 2, dy: 0, dz: 0, block: 'oak_planks' },
        { dx: 0, dy: 0, dz: 1, block: 'oak_planks' },
        { dx: 1, dy: 0, dz: 1, block: 'oak_planks' },
        { dx: 2, dy: 0, dz: 1, block: 'oak_planks' }
      ],
      storageRoom: [
        { dx: 0, dy: 0, dz: 0, block: 'stone' },
        { dx: 1, dy: 0, dz: 0, block: 'stone' },
        { dx: 0, dy: 0, dz: 1, block: 'stone' },
        { dx: 1, dy: 0, dz: 1, block: 'stone' }
      ],
      farm: [
        { dx: -2, dy: 0, dz: 0, block: 'farmland' },
        { dx: -1, dy: 0, dz: 0, block: 'farmland' },
        { dx: 0, dy: 0, dz: 0, block: 'farmland' },
        { dx: 1, dy: 0, dz: 0, block: 'farmland' }
      ],
      tower: [
        { dx: 0, dy: 0, dz: 0, block: 'stone_bricks' },
        { dx: 0, dy: 1, dz: 0, block: 'stone_bricks' },
        { dx: 0, dy: 2, dz: 0, block: 'stone_bricks' },
        { dx: 0, dy: 3, dz: 0, block: 'stone_bricks' }
      ]
    };

    // attempt to load blueprints from data/blueprints
    this.loadAllBlueprints();
    logger.info('Builder system initialized');
  }

  async buildStructure(structureType, position) {
    // allow passing in a blueprint object directly
    if (!this.structures[structureType] && structureType && typeof structureType !== 'string') {
      // if object given
      this.structures.tempBlueprint = structureType;
      structureType = 'tempBlueprint';
    }
    if (!this.bot) {
      logger.warn('Bot not available for building');
      return false;
    }

    const layout = this.structures[structureType];
    if (!layout) {
      logger.error('Unknown structure type', { structureType });
      return false;
    }

    this.isBuilding = true;
    this.currentStructure = structureType;

    try {
      logger.info(`Building ${structureType}`, { position });

      let blocksPlaced = 0;

      // Clear area first
      await this.clearArea(position, 5);

      // Place blocks
      for (const blockDef of layout) {
        const blockPos = {
          x: Math.round(position.x) + blockDef.dx,
          y: Math.round(position.y) + blockDef.dy,
          z: Math.round(position.z) + blockDef.dz
        };

        // Get required block from inventory
        const block = this.bot.inventory.items().find(item => item.name === blockDef.block);
        if (block) {
          await this.bot.equip(block, 'hand');
          await this.placeBlock(blockPos, blockDef.block);
          blocksPlaced++;
          await this.sleep(200); // Prevent spam
        }
      }

      this.isBuilding = false;
      logger.info('Structure built', { structureType, blocksPlaced });
      return true;
    } catch (err) {
      logger.error('Building error', { error: err.message });
      this.isBuilding = false;
      return false;
    }
  }

  async placeBlock(position, blockType) {
    try {
      // Get block face to place on
      const belowBlock = this.bot.blockAt({
        x: position.x,
        y: position.y - 1,
        z: position.z
      });

      if (belowBlock && belowBlock.shape) {
        await this.bot.placeBlock(belowBlock, { x: 0, y: 1, z: 0 });
        logger.debug('Block placed', { position, blockType });
      }
    } catch (err) {
      logger.debug('Block placement failed', { error: err.message });
    }
  }

  async clearArea(position, radius) {
    logger.info('Clearing area for building', { position, radius });

    const baseX = Math.round(position.x);
    const baseY = Math.round(position.y);
    const baseZ = Math.round(position.z);

    let cleared = 0;

    for (let x = baseX - radius; x <= baseX + radius; x++) {
      for (let z = baseZ - radius; z <= baseZ + radius; z++) {
        for (let y = baseY; y <= baseY + 3; y++) {
          const block = this.bot.blockAt({ x, y, z });
          if (block && block.name !== 'air' && !this.isUnbreakable(block.name)) {
            try {
              await this.bot.dig(block);
              cleared++;
              await this.sleep(50);
            } catch (err) {
              // Continue if can't dig
            }
          }
        }
      }
    }

    logger.debug('Area cleared', { cleared });
  }

  isUnbreakable(blockName) {
    const unbreakable = ['bedrock', 'obsidian', 'barrier'];
    return unbreakable.includes(blockName);
  }

  async buildWall(length, height, position) {
    logger.info('Building wall', { length, height });

    const blocks = [];
    for (let i = 0; i < length; i++) {
      for (let h = 0; h < height; h++) {
        blocks.push({
          dx: i,
          dy: h,
          dz: 0,
          block: 'stone_bricks'
        });
      }
    }

    // Store temporarily
    const tempStructure = this.structures.wall || blocks;
    this.structures.wall = blocks;

    const result = await this.buildStructure('wall', position);
    return result;
  }

  async buildStorage(position) {
    return this.buildStructure('storageRoom', position);
  }

  async buildFarm(position) {
    return this.buildStructure('farm', position);
  }

  async buildSmallHouse(position) {
    return this.buildStructure('starterHouse', position);
  }

  async buildTower(position) {
    return this.buildStructure('tower', position);
  }

  stopBuilding() {
    this.isBuilding = false;
    this.currentStructure = null;
    logger.debug('Building stopped');
  }

  isBuildingActive() {
    return this.isBuilding;
  }

  getCurrentStructure() {
    return this.currentStructure;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getAvailableStructures() {
    return Object.keys(this.structures);
  }

  loadBlueprint(name, filePath) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        this.structures[name] = data;
        logger.info('Loaded blueprint', { name, filePath });
      } else {
        logger.warn('Blueprint file did not contain array', { name, filePath });
      }
    } catch (e) {
      logger.error('Failed to load blueprint', { name, filePath, error: e.message });
    }
  }

  loadAllBlueprints() {
    const dir = path.resolve(process.cwd(), 'data', 'blueprints');
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    files.forEach(f => {
      const name = path.basename(f, '.json');
      this.loadBlueprint(name, path.join(dir, f));
    });
  }
}
