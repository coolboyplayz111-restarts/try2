import logger from './logger.js';

export class CommandRouter {
  constructor(bot, aiModules) {
    this.bot = bot;
    this.aiModules = aiModules;
    this.commands = new Map();
    this.registerDefaultCommands();
  }

  registerDefaultCommands() {
    // Status command
    this.register('status', async (args) => {
      const health = this.bot.health || 0;
      const food = this.bot.food || 0;
      const xp = this.bot.experience.level || 0;
      const pos = this.bot.entity.position;

      const status = `Health: ${health.toFixed(1)}/20, Hunger: ${food}/20, XP Level: ${xp}, Position: ${pos.x.toFixed(1)},${pos.y.toFixed(1)},${pos.z.toFixed(1)}`;
      this.bot.chat(status);
      logger.info('Status reported', { health, food, xp, pos });
    });

    // Inventory command
    this.register('inventory', async (args) => {
      const slots = this.bot.inventory.slots;
      let inv = 'Inventory: ';
      slots.forEach((item, i) => {
        if (item) {
          inv += `[${i}] ${item.name}(${item.count}) `;
        }
      });
      this.bot.chat(inv);
      logger.info('Inventory displayed');
    });

    // Help command
    this.register('help', async (args) => {
      const commands = Array.from(this.commands.keys()).join(', ');
      this.bot.chat(`Available commands: ${commands}`);
      logger.info('Help displayed');
    });

    // Goto command
    this.register('goto', async (args) => {
      if (args.length < 3) {
        this.bot.chat('Usage: !goto <x> <y> <z>');
        return;
      }
      const x = parseInt(args[0]);
      const y = parseInt(args[1]);
      const z = parseInt(args[2]);

      if (this.aiModules.movement) {
        this.aiModules.movement.goTo(x, y, z);
        this.bot.chat(`Moving to ${x}, ${y}, ${z}`);
        logger.info('Goto command', { target: { x, y, z } });
      }
    });

    // Build city command
    this.register('buildcity', async (args) => {
      const cityType = args[0] || 'village';
      if (this.aiModules.cityBuilder) {
        this.bot.chat(`Starting city build: ${cityType}`);
        await this.aiModules.cityBuilder.buildCity(cityType);
      }
    });

    // Mine command
    this.register('mine', async (args) => {
      if (this.aiModules.mining) {
        const oreType = args[0] || 'iron';
        this.bot.chat(`Starting mining for ${oreType}`);
        await this.aiModules.mining.mineOres(oreType, 10);
      }
    });

    // Combat test
    this.register('combat', async (args) => {
      if (this.aiModules.combat) {
        this.bot.chat('Testing combat system');
        const nearbyMobs = this.bot.nearestEntity(entity => entity.type === 'mob');
        if (nearbyMobs) {
          await this.aiModules.combat.attack(nearbyMobs);
        }
      }
    });

    // Personality control
    this.register('personality', async (args) => {
      if (!this.aiModules.chatManager) {
        this.bot.chat('No chat manager available');
        return;
      }
      if (args.length === 0) {
        this.bot.chat(`Current personality: ${this.aiModules.chatManager.defaultPersonality}`);
      } else {
        const p = args[0].toLowerCase();
        this.aiModules.chatManager.defaultPersonality = p;
        this.bot.chat(`Personality set to ${p}`);
        logger.info('Personality changed', { personality: p });
      }
    });

    // Combat commands
    this.register('fight', async (args) => {
      if (this.aiModules.combat) {
        const action = args[0] || 'auto';
        if (action === 'auto') {
          const radius = parseInt(args[1]) || 32;
          this.bot.chat(`Starting auto-combat in ${radius} block radius...`);
          await this.aiModules.combat.autoCombat(radius);
          this.bot.chat('Auto-combat ended');
        } else if (action === 'stop') {
          this.aiModules.combat.stopAttack();
          this.bot.chat('Combat stopped');
        } else if (action === 'defend') {
          this.aiModules.combat.defendPlayers();
          this.bot.chat('Defending against nearby threats');
        }
        logger.info('Fight command executed', { action });
      }
    });
  }

  register(command, handler) {
    this.commands.set(command.toLowerCase(), handler);
    logger.debug(`Command registered: ${command}`);
  }

  async execute(commandStr) {
    if (!commandStr.startsWith('!')) return false;

    const parts = commandStr.slice(1).split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    const handler = this.commands.get(command);
    if (!handler) {
      logger.warn(`Unknown command: ${command}`);
      return false;
    }

    try {
      await handler(args);
      return true;
    } catch (err) {
      logger.error(`Command execution failed: ${command}`, { error: err.message });
      this.bot.chat(`Error executing command: ${err.message}`);
      return false;
    }
  }
}

export default CommandRouter;
