import BotConnection from './connection.js';
import CommandRouter from './commandRouter.js';
import logger from './logger.js';
import config from './config.js';

// Import AI modules
import Brain from '../ai/brain.js';
import SmartBrain from '../ai/smartBrain.js';
import CommandProcessor from '../ai/commandProcessor.js';
import Perception from '../ai/perception.js';
import Memory from '../ai/memory.js';
import Planner from '../ai/planner.js';
import Learning from '../ai/learning.js';
import Conversation from '../ai/conversation.js';
import ChatManager from '../ai/chatManager.js';
import CityPlanner from '../ai/cityPlanner.js';

// Import system modules
import Movement from '../systems/movement.js';
import Combat from '../systems/combat.js';
import Mining from '../systems/mining.js';
import Farming from '../systems/farming.js';
import Inventory from '../systems/inventory.js';
import Crafting from '../systems/crafting.js';
import Survival from '../systems/survival.js';
import Builder from '../systems/builder.js';
import CityBuilder from '../systems/cityBuilder.js';
import { getSocket } from '../dashboard/socket.js';

let connection = null;
let bot = null;
let commandRouter = null;
let aiModules = {};

// performance tracking
let tickIntervals = [];

async function initializeBotSystems() {
  logger.info('Initializing bot systems...');

  // Initialize command processor FIRST (other modules will use it)
  const commandProcessor = new CommandProcessor(bot, aiModules);

  // Initialize AI modules
  aiModules = {
    perception: new Perception(bot),
    memory: new Memory(),
    planner: new Planner(),
    learning: new Learning(),
    brain: new SmartBrain(bot, null), // Will be populated below
    conversation: new Conversation(bot.username || ''),
    cityPlanner: new CityPlanner(),
    commandProcessor: commandProcessor
  };

  // Wire command processor into smart brain
  aiModules.brain.ai = aiModules;

  // Initialize system modules
  aiModules.movement = new Movement(bot);
  aiModules.combat = new Combat(bot);
  aiModules.mining = new Mining(bot);
  aiModules.farming = new Farming(bot);
  aiModules.inventory = new Inventory(bot);
  aiModules.crafting = new Crafting(bot);
  aiModules.survival = new Survival(bot);
  aiModules.builder = new Builder(bot);
  aiModules.cityBuilder = new CityBuilder(bot);

  // Initialize command router
  commandRouter = new CommandRouter(bot, aiModules);

  // Set up message listener - Now uses smart brain for interpretation
  bot.on('message', async (jsonMsg) => {
    const msg = jsonMsg.toString();
    
    // Try to execute as command using smart brain (handles natural language)
    try {
      const result = await aiModules.brain.interpretAndExecute(msg);
      if (result) {
        logger.info('Command executed', { result });
        if (result.isCommand && result.data && aiModules.commandProcessor) {
          logger.debug('Auto-executing command data', result.data);
          await executeAction(result.data);
        }
      }
    } catch (err) {
      logger.debug('Smart brain command error', { error: err.message });
    }
  });

  // Chat manager handles player conversations and mentions
  aiModules.chatManager = new ChatManager(bot, aiModules.conversation, {
    defaultPersonality: 'helpful',
    rateLimit: config.ai.chatRateLimit
  });
  bot.on('chat', async (username, message) => {
    try {
      await aiModules.chatManager.handleChat(username, message);
    } catch (e) {
      logger.debug('chat event handler error', { error: e.message });
    }
  });

  // Set up perception updates
  setInterval(async () => {
    try {
      const perception = await aiModules.perception.perceive();
      aiModules.memory.updateMemory(perception);
      
      // Let brain decide next action
      const action = await aiModules.brain.decideAction(
        perception,
        aiModules.memory.getMemory()
      );

      if (action) {
        await executeAction(action);
      }
    } catch (err) {
      logger.debug('Perception update error', { error: err.message });
    }
  }, config.ai.updateInterval);

  // Persist memory periodically
  setInterval(() => {
    aiModules.memory.persistMemory();
  }, config.ai.memoryPersistInterval);

  logger.info('Bot systems initialized');
}

async function executeAction(action) {
  try {
    switch (action.type) {
      case 'move':
        if (aiModules.movement) {
          await aiModules.movement.goTo(action.x, action.y, action.z);
        }
        break;
      case 'attack':
        if (aiModules.combat && action.target) {
          await aiModules.combat.attack(action.target);
        }
        break;
      case 'mine':
        if (aiModules.mining && action.oreType) {
           await aiModules.mining.mineOres(action.oreType, action.count || 10);
         }
         break;
       case 'stripmine':
         if (aiModules.mining) {
           await aiModules.mining.mineOres('stone', 100);
         }
         break;
       case 'quarry':
         if (aiModules.mining) {
           // simple quarry: mine all ores in range
           await aiModules.mining.mineOres('iron_ore', 50);
         }
         break;
       case 'digdown':
         if (aiModules.mining && aiModules.movement) {
           // dig straight down a few blocks
           const pos = bot.entity.position;
           for (let i = 1; i <= 5; i++) {
             const block = bot.blockAt(pos.offset(0, -i, 0));
             if (block) await aiModules.mining.mineBlock(block);
           }
         }
         break;
       case 'digup':
         if (aiModules.mining && aiModules.movement) {
           const pos = bot.entity.position;
           for (let i = 1; i <= 5; i++) {
             const block = bot.blockAt(pos.offset(0, i, 0));
             if (block) await aiModules.mining.mineBlock(block);
           }
         }
         break;
       case 'farm':
         if (aiModules.farming) {
           await aiModules.farming.plantCrops(action.cropType || 'wheat', action.count || 10);
         }
         break;
       case 'harvest':
         if (aiModules.farming) {
           await aiModules.farming.harvestCrops(action.cropType || 'wheat');
         }
         break;
       case 'breed':
         if (aiModules.farming) {
           await aiModules.farming.breedAnimals(action.animal || 'cow');
         }
         break;
       default:
         logger.debug('Unknown action type', { actionType: action.type });
     }
   } catch (err) {
     logger.debug('Action execution error', { error: err.message, action: action.type });
   }
}

async function startBot() {
  try {
    logger.info('Starting Minecraft AI Bot');
    connection = new BotConnection();
    bot = await connection.connect();

    logger.info('Connected to server');
    await initializeBotSystems();

    // Set up tick rate tracking
    let lastTick = Date.now();
    if (bot) {
      bot.on('physicTick', () => {
        const now = Date.now();
        const dt = now - lastTick;
        lastTick = now;
        tickIntervals.push(dt);
        if (tickIntervals.length > 20) tickIntervals.shift();
      });
    }

    logger.info('Bot ready and operational');
    // Start wiring to dashboard socket when available
    wireDashboardIntegration();
  } catch (err) {
    logger.error('Failed to start bot', { error: err.message });
    process.exit(1);
  }
}

function wireDashboardIntegration() {
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    try {
      const io = getSocket();
      if (!io) {
        if (attempts > 30) {
          clearInterval(interval);
          logger.warn('Dashboard socket not available for wiring');
        }
        return;
      }

      io.on('connection', (socket) => {
        logger.info('Dashboard client connected (bot side)');

        socket.on('control', (data) => {
          try {
            if (!bot) return;
            const ctrl = data.control;
            const value = data.value;
            switch (ctrl) {
              case 'forward': bot.setControlState('forward', value); break;
              case 'back': bot.setControlState('back', value); break;
              case 'left': bot.setControlState('left', value); break;
              case 'right': bot.setControlState('right', value); break;
              case 'jump': bot.setControlState('jump', value); break;
              case 'sneak': bot.setControlState('sneak', value); break;
              default: break;
            }
          } catch (e) {
            logger.debug('Control event error', { error: e.message });
          }
        });

        socket.on('chat', (msg) => {
          try { if (bot) bot.chat(msg); } catch (e) { logger.debug('Chat relay error', { error: e.message }); }
        });

        socket.on('buildcity', async (type) => {
          try {
            if (aiModules.cityBuilder) {
              await aiModules.cityBuilder.buildCity(type);
            }
          } catch (e) {
            logger.error('City build via dashboard failed', { error: e.message });
          }
        });

        socket.on('dashboard-command', (cmd) => {
          logger.info('Received dashboard command', cmd);
          switch (cmd.type) {
            case 'pause':
              if (aiModules.brain) aiModules.brain.paused = true;
              break;
            case 'resume':
              if (aiModules.brain) aiModules.brain.paused = false;
              break;
            case 'reconnect':
              if (connection) connection.scheduleReconnect();
              break;
            case 'force-task':
              if (cmd.data) {
                // directly execute action if structure matches
                executeAction(cmd.data).catch(e=>logger.error('Forced task failed',{error:e.message,task:cmd.data}));
              }
              break;
            case 'toggle-auto-move':
              try {
                const enabled = cmd.data && typeof cmd.data.enabled === 'boolean' ? cmd.data.enabled : !aiModules.movement.isAutoMoveEnabled();
                if (aiModules.movement && typeof aiModules.movement.setAutoMove === 'function') {
                  aiModules.movement.setAutoMove(enabled);
                }
              } catch (e) { logger.debug('toggle-auto-move error', { error: e.message }) }
              break;
            case 'toggle-reconnect':
              try {
                const enabled = cmd.data && typeof cmd.data.enabled === 'boolean' ? cmd.data.enabled : true;
                if (connection && typeof connection.setReconnectEnabled === 'function') {
                  connection.setReconnectEnabled(enabled);
                }
              } catch (e) { logger.debug('toggle-reconnect error', { error: e.message }) }
              break;
            default:
              break;
          }
        });

        socket.on('toggle-changed', (data) => {
          logger.info('Feature toggle changed', data);
          const { feature, enabled } = data;
          
          switch (feature) {
            case 'aiChat':
              if (aiModules.chatManager) {
                aiModules.chatManager.enabled = enabled;
              }
              break;
            case 'farming':
              if (aiModules.farming) {
                aiModules.farming.enabled = enabled;
              }
              break;
            case 'mining':
              if (aiModules.mining) {
                aiModules.mining.enabled = enabled;
              }
              break;
            case 'combat':
              if (aiModules.combat) {
                aiModules.combat.enabled = enabled;
              }
              break;
            case 'survival':
              if (aiModules.survival) {
                aiModules.survival.enabled = enabled;
              }
              break;
            case 'building':
              if (aiModules.builder) {
                aiModules.builder.enabled = enabled;
              }
              break;
            case 'crafting':
              if (aiModules.crafting) {
                aiModules.crafting.enabled = enabled;
              }
              break;
            case 'inventory':
              if (aiModules.inventory) {
                aiModules.inventory.enabled = enabled;
              }
              break;
            case 'pathfinding':
              if (aiModules.movement) {
                aiModules.movement.enabled = enabled;
              }
              break;
            case 'learning':
              if (aiModules.learning) {
                aiModules.learning.enabled = enabled;
              }
              break;
            default:
              logger.debug('Unknown feature toggle', { feature });
          }
        });
      });

      // Emit periodic status
          // Emit rich telemetry every 500ms
          setInterval(() => {
            try {
              if (!bot) return;
              const invSummary = aiModules.inventory ? aiModules.inventory.getSummary() : { items: [] };
              const currentTask = aiModules.brain ? aiModules.brain.getCurrentTask() : null;
              const movement = aiModules.movement || {};

              const telemetry = {
                bot: {
                  username: bot.username || (bot.entity && bot.entity.username) || 'bot',
                  connected: !!(bot && bot.entity),
                  server: `${config.minecraft.host}:${config.minecraft.port}`,
                  ping: (bot._client && bot._client.ping) ? bot._client.ping : 0
                },
                position: bot.entity && bot.entity.position ? {
                  x: Math.round(bot.entity.position.x),
                  y: Math.round(bot.entity.position.y),
                  z: Math.round(bot.entity.position.z),
                  dimension: 'overworld'
                } : null,
                stats: {
                  health: bot.health || 0,
                  food: bot.food || 0,
                  xp: bot.experience ? bot.experience.level : 0,
                  armor: 0,
                  toolDurability: null
                },
                movement: {
                  state: movement.isMovingToTarget ? (movement.isMovingToTarget() ? 'moving' : 'idle') : 'unknown',
                  speed: 0,
                  target: movement.getCurrentTarget ? movement.getCurrentTarget() : null
                },
                inventory: invSummary.items || [],
                ai: {
                  currentGoal: currentTask ? currentTask.type : null,
                  targetBlock: currentTask && currentTask.oreType ? currentTask.oreType : null,
                  confidence: 0.9,
                  currentTask,
                  structures: aiModules.builder ? aiModules.builder.getAvailableStructures() : []
                },
                perception: aiModules.perception ? aiModules.perception.lastPerception : null,
                viewerPort: connection && connection.viewerPort ? connection.viewerPort : null,
                performance: {
                  cpu: process.cpuUsage(),
                  memory: process.memoryUsage(),
                  tickRate: (tickIntervals.length > 0) ? (1000 / (tickIntervals.reduce((a,b)=>a+b,0)/tickIntervals.length)).toFixed(1) : null
                },
                timestamp: Date.now()
              };
              io.emit('telemetry', telemetry);
            } catch (e) {
              // ignore
            }
          }, 500);

          clearInterval(interval);
          logger.info('Wired dashboard socket integration');
        } catch (err) {
          // keep retrying
        }
      }, 2000);
    }

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down bot...');
  if (aiModules.memory) {
    aiModules.memory.persistMemory();
  }
  if (connection) {
    connection.disconnect();
  }
  process.exit(0);
});

// Start the bot
startBot();
