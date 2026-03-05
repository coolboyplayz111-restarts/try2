import mineflayer from 'mineflayer';
import { pathfinder, Movements } from 'mineflayer-pathfinder';
import minecraftData from 'minecraft-data';
import config from './config.js';
import logger from './logger.js';

export class BotConnection {
  constructor() {
    this.bot = null;
    this.reconnectAttempts = 0;
    this.reconnectDelay = config.reconnection.initialDelay;
    this.isIntentionallyClosed = false;
    this.eventListeners = [];
    this.reconnectEnabled = config.reconnection.enabled;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      logger.info(`Attempting to connect to ${config.minecraft.host}:${config.minecraft.port}`);

      const options = {
        host: config.minecraft.host,
        port: config.minecraft.port,
        username: config.minecraft.username,
        password: config.minecraft.password,
        version: config.minecraft.version,
        auth: config.minecraft.password ? 'microsoft' : 'offline'
      };

      try {
        this.bot = mineflayer.createBot(options);

        // Load pathfinder plugin immediately
        this.bot.loadPlugin(pathfinder);

        // Connection events
        this.bot.once('login', () => {
          logger.info('Bot logged in successfully');
          this.reconnectAttempts = 0;
          this.reconnectDelay = config.reconnection.initialDelay;
          
          // Load optional plugins asynchronously after login
          this.loadOptionalPlugins().catch(e => logger.debug('Plugin loading error', { error: e.message }));
          
          resolve(this.bot);
        });

        this.bot.on('spawn', async () => {
          if (!this.bot.entity) {
            logger.debug('Spawn event: entity not ready yet');
            return;
          }
          
          logger.info('Bot spawned', { pos: this.bot.entity.position });
          
          // Setup pathfinder movements
          const mcData = minecraftData(this.bot.version);
          const movements = new Movements(this.bot, mcData);
          this.bot.pathfinder.setMovements(movements);

          // Start mineflayer viewer for live 3D view (if available)
          try {
            const viewerPort = (config.dashboard && config.dashboard.port) ? config.dashboard.port + 1 : 3001;
            const viewerLib = await import('mineflayer-viewer');
            const viewerFn = viewerLib.default || viewerLib.mineflayerViewer;
            if (viewerFn && this.bot.entity) {
              viewerFn(this.bot, { port: viewerPort, firstPerson: false });
              this.viewerPort = viewerPort;
              logger.info('Viewer started', { port: viewerPort });
            }
          } catch (e) {
            this.viewerPort = null;
            logger.debug('Viewer not available or failed to start', { error: e.message });
          }
        });

        this.bot.on('end', () => {
          logger.warn('Bot disconnected from server');
          if (!this.isIntentionallyClosed && this.reconnectEnabled) {
            this.scheduleReconnect();
          }
        });

        this.bot.on('error', (err) => {
          logger.error('Bot connection error', { error: err.message });
          if (!this.isIntentionallyClosed && this.reconnectEnabled) {
            this.scheduleReconnect();
          }
        });

        this.bot.on('kicked', (reason) => {
          logger.warn('Bot kicked from server', { reason });
        });

        this.bot.on('message', (jsonMsg) => {
          const msg = jsonMsg.toString();
          logger.debug('Chat message received', { msg });
          if (this.eventListeners.length > 0) {
            this.eventListeners.forEach(listener => {
              if (listener.event === 'chat') {
                listener.callback(msg);
              }
            });
          }
        });

      } catch (err) {
        logger.error('Failed to create bot', { error: err.message });
        this.scheduleReconnect();
        reject(err);
      }
    });
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= config.reconnection.maxAttempts) {
      logger.error('Max reconnection attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(config.reconnection.delayMultiplier, this.reconnectAttempts - 1),
      config.reconnection.maxDelay
    );

    logger.warn(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${config.reconnection.maxAttempts})`);

    setTimeout(() => {
      this.connect().catch(err => {
        logger.error('Reconnection failed', { error: err.message });
      });
    }, delay);
  }

  setReconnectEnabled(enabled = true) {
    this.reconnectEnabled = !!enabled;
    logger.info('Reconnect enabled set', { enabled: this.reconnectEnabled });
  }

  disconnect() {
    this.isIntentionallyClosed = true;
    if (this.bot) {
      this.bot.quit();
      this.bot = null;
    }
  }

  on(event, callback) {
    if (this.bot) {
      this.bot.on(event, callback);
    }
    this.eventListeners.push({ event, callback });
  }

  getBot() {
    return this.bot;
  }

  isConnected() {
    return this.bot && this.bot.entity && this.bot.entity.position;
  }

  async loadOptionalPlugins() {
    // Attempt to load optional plugins asynchronously
    try {
      const pvp = await import('mineflayer-pvp');
      this.bot.loadPlugin(pvp.default || pvp);
      logger.debug('PVP plugin loaded');
    } catch (e) {
      logger.debug('PVP plugin not available');
    }
    
    try {
      const autoEat = await import('mineflayer-auto-eat');
      this.bot.loadPlugin(autoEat.default || autoEat);
      logger.debug('Auto-eat plugin loaded');
    } catch (e) {
      logger.debug('Auto-eat plugin not available');
    }
    
    try {
      const armorManager = await import('mineflayer-armor-manager');
      this.bot.loadPlugin(armorManager.default || armorManager);
      logger.debug('Armor manager plugin loaded');
    } catch (e) {
      logger.debug('Armor manager plugin not available');
    }
    
    try {
      const toolPlugin = await import('mineflayer-tool');
      this.bot.loadPlugin(toolPlugin.default || toolPlugin);
      logger.debug('Tool plugin loaded');
    } catch (e) {
      logger.debug('Tool plugin not available');
    }
  }
}

export default BotConnection;
