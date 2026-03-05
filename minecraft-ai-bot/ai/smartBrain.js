/**
 * Smart AI Brain with Natural Language Understanding
 * Understands what the user wants and executes commands
 */

export default class SmartBrain {
  constructor(bot, aiModules = {}) {
    this.bot = bot;
    this.ai = aiModules;
    this.paused = false;
    this.currentTask = null;
    this.taskQueue = [];
    this.personality = {
      name: 'Dawud',
      style: 'concise', // concise, detailed, technical, casual
      verbose: false    // Don't say unnecessary things
    };
    this.understanding = {};
    this.priorities = {
      survival: 1,
      defense: 2,
      resourceGathering: 3,
      exploration: 5
    };
  }

  /**
   * Smarter interpretation of natural language
   * Maps user intent to actual commands
   */
  async interpretAndExecute(input) {
    if (!input || this.paused) return null;

    const text = input.toLowerCase().trim();
    let command = null;
    let args = [];

    // MOVEMENT INTENTS
    if (text.includes('go to') || text.includes('goto') || text.includes('move to')) {
      const match = text.match(/(?:go|goto|move)\s+to\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)/);
      if (match) command = 'goto', args = [match[1], match[2], match[3]];
    } else if (text.includes('stop') || text.includes('halt') || text.includes('cease')) {
      command = 'stop';
    } else if (text.includes('come') || text.includes('come here')) {
      command = 'come';
    } else if (text.includes('follow') && !text.includes('not follow')) {
      const player = text.split('follow')[1]?.trim().split(/\s+/)[0];
      if (player) command = 'follow', args = [player];
    } else if (text.includes('wander') || text.includes('explore') || text.includes('roam')) {
      command = 'wander';
    } else if (text.includes('jump')) {
      command = 'jump';
    }
    // MINING INTENTS
    else if (text.includes('mine') || text.includes('dig')) {
      const ores = ['diamond', 'gold', 'iron', 'copper', 'stone', 'coal'];
      const ore = ores.find(o => text.includes(o)) || 'stone';
      command = 'mine', args = [ore];
    } else if (text.includes('strip mine') || text.includes('stripmine')) {
      command = 'stripmine';
    } else if (text.includes('quarry')) {
      command = 'quarry';
    } else if (text.includes('dig down') || text.includes('digdown')) {
      command = 'digdown';
    }
    // FARMING INTENTS
    else if (text.includes('farm') || text.includes('farming')) {
      command = 'farm';
    } else if (text.includes('harvest')) {
      command = 'harvest';
    } else if (text.includes('plant')) {
      const crops = ['wheat', 'carrot', 'potato', 'beetroot'];
      const crop = crops.find(c => text.includes(c)) || 'wheat';
      command = 'plant', args = [crop];
    } else if (text.includes('breed') || text.includes('breeding')) {
      const animals = ['cow', 'pig', 'sheep', 'chicken', 'horse'];
      const animal = animals.find(a => text.includes(a)) || 'cow';
      command = 'breed', args = [animal];
    } else if (text.includes('milk')) {
      command = 'milkcow';
    } else if (text.includes('eggs') || text.includes('egg collect')) {
      command = 'eggs';
    }
    // COMBAT INTENTS
    else if (text.includes('fight') || text.includes('attack mob')) {
      command = 'attack';
    } else if (text.includes('pvp') || (text.includes('attack') && text.match(/@\w+|player|player/))) {
      const player = text.split(/attack|pvp/).pop()?.trim().split(/\s+/)[0];
      if (player) command = 'pvp', args = [player];
    } else if (text.includes('defend')) {
      const player = text.split('defend')[1]?.trim().split(/\s+/)[0];
      if (player) command = 'defend', args = [player];
    } else if (text.includes('protect')) {
      command = 'protect';
    }
    // BUILDING INTENTS
    else if (text.includes('build')) {
      const structures = ['wall', 'house', 'tower', 'bridge', 'house'];
      const struct = structures.find(s => text.includes(s)) || 'wall';
      const match = text.match(/\d+/);
      const size = match ? match[0] : '10';
      command = 'build', args = [struct, size];
    } else if (text.includes('flatten')) {
      command = 'flatten';
    }
    // CRAFTING/UTILITY INTENTS
    else if (text.includes('craft')) {
      const item = text.split('craft')[1]?.trim();
      if (item && item.length > 0) command = 'craft', args = [item];
    } else if (text.includes('smelt')) {
      command = 'smelt';
    } else if (text.includes('drop')) {
      const item = text.split('drop')[1]?.trim();
      if (item) command = 'drop', args = [item];
    } else if (text.includes('deposit')) {
      command = 'deposit';
    } else if (text.includes('sort') || text.includes('organize')) {
      command = 'sort';
    }
    // STATE COMMANDS
    else if (text.includes('pause') || text.includes('sleep') || text.includes('rest')) {
      command = 'pause';
    } else if (text.includes('resume') || text.includes('wake') || text.includes('start')) {
      command = 'resume';
    } else if (text.includes('status') || text.includes('what are you doing')) {
      command = 'status';
    }
    // INFO COMMANDS
    else if (text.includes('health')) {
      command = 'health';
    } else if (text.includes('hunger') || text.includes('food')) {
      command = 'food';
    } else if (text.includes('inventory')) {
      command = 'inventory';
    } else if (text.includes('coords') || text.includes('position') || text.includes('where')) {
      command = 'coords';
    } else if (text.includes('time')) {
      command = 'time';
    } else if (text.includes('help') || text.includes('commands')) {
      command = 'help';
    }

    // Execute if we understood the command
    if (command && this.ai.commandProcessor) {
      try {
        const result = await this.ai.commandProcessor.execute(command, args.join(' '));
        return result;
      } catch (err) {
        return { success: false, response: `Error executing ${command}: ${err.message}` };
      }
    }

    return null;
  }

  /**
   * Decide next action based on situation
   */
  async decideAction(perception, memory) {
     if (this.paused) return null;

     // If there's a task queue, do next task
     if (this.taskQueue.length > 0) {
       return this.taskQueue.shift();
     }

     // Survival logic
     if (this.bot.health && this.bot.health < 5) {
       return { type: 'retreat', priority: this.priorities.survival };
     }
     if (this.bot.food && this.bot.food < 8) {
       return { type: 'eat', priority: this.priorities.survival };
     }

     // Defense: attack nearby hostiles first
     if (perception.hostileMobs && perception.hostileMobs.length > 0) {
       return { type: 'attack', target: perception.hostileMobs[0], priority: this.priorities.defense };
     }

     // Resource gathering: mine ores if detected
     if (perception.ores && perception.ores.length > 0) {
       const ore = perception.ores[0];
       return { type: 'mine', oreType: ore.type, priority: this.priorities.resourceGathering };
     }

     // Farming: harvest crops if any ready
     if (perception.blocks && perception.blocks.crops && perception.blocks.crops.length > 0) {
       const crop = perception.blocks.crops[0];
       return { type: 'harvest', cropType: crop.name, priority: this.priorities.resourceGathering };
     }

     // If nothing else, maybe explore randomly
     if (Math.random() < 0.2) {
       const randomX = Math.random() * 1000 - 500;
       const randomZ = Math.random() * 1000 - 500;
       return {
         type: 'move',
         x: randomX,
         y: 64,
         z: randomZ,
         priority: this.priorities.exploration
       };
     }

    // Default: idle
    return null;
  }

  /**
   * Queue a task to be executed
   */
  queueTask(task) {
    this.taskQueue.push(task);
  }

  /**
   * Clear current task
   */
  getCurrentTask() {
    return this.currentTask;
  }

  /**
   * Set personality
   */
  setPersonality(name, style = 'concise') {
    this.personality.name = name || 'Dawud';
    this.personality.style = style;
    this.personality.verbose = style !== 'concise';
  }

  getName() {
    return this.personality.name;
  }

  getTaskQueue() {
    return this.taskQueue;
  }

  clearTaskQueue() {
    this.taskQueue = [];
  }
}
