import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { Server as SocketIOServer } from 'socket.io';
import OpenAI from 'openai';
import logger from '../bot/logger.js';
import config from '../bot/config.js';
import Conversation from '../ai/conversation.js';
import { initializeSocket } from './socket.js';

const app = express();
const server = http.createServer(app);
// Initialize Socket.IO using shared initializer
const io = initializeSocket(server);

// require token on socket connections
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (token && token === config.dashboard.apiToken) {
    return next();
  }
  return next(new Error('Unauthorized'));
});

// initialize conversation service (shared between dashboard clients)
const conversationService = new Conversation();

const openaiClient = (config.openai && config.openai.apiKey) ? new OpenAI({ apiKey: config.openai.apiKey }) : null;

// Session setup
app.use(session({
  secret: 'minecraft-ai-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Simple hard-coded admin - in production use a DB
const adminUser = {
  username: 'admin',
  passwordHash: bcrypt.hashSync(config.dashboard.password + '', 10)
};

// compute public directory relative to this file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

// authentication middleware for API tokens
function requireToken(req, res, next) {
  const token = req.headers['x-api-token'] || req.query.token;
  if (token && token === config.dashboard.apiToken) return next();
  return res.status(401).json({ ok: false, error: 'Unauthorized' });
}

// rate limiter
try {
  const rateLimit = (await import('express-rate-limit')).default;
  app.use(rateLimit({
    windowMs: config.dashboard.rateLimit.windowMs,
    max: config.dashboard.rateLimit.max
  }));
} catch (e) {
  logger.warn('Rate limit package not installed');
}

// ensure root always serves index
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === adminUser.username && bcrypt.compareSync(password, adminUser.passwordHash)) {
    req.session.user = { username };
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: 'Invalid credentials' });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// Basic auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/');
}

app.get('/api/status', requireAuth, requireToken, (req, res) => {
  // Would return bot status
  res.json({ ok: true, status: 'connected' });
});

// Bot control commands
const validCommands = ['pause','resume','reconnect','force-task','toggle-auto-move','toggle-reconnect'];
app.post('/bot/command', requireAuth, requireToken, (req, res) => {
  const { type, data } = req.body || {};
  if (!validCommands.includes(type)) {
    return res.status(400).json({ ok: false, error: 'Invalid command' });
  }
  io.emit('dashboard-command', { type, data });
  return res.json({ ok: true });
});

// Chat endpoint - processes chat messages, returns AI reply with command detection
app.post('/api/chat', async (req, res) => {
  const {
    message = '',
    aiName = 'Dawud',
    personality = 'helpful',
    temperature = 0.7,
    playerName = 'web' // optional identifier for memory
  } = req.body || {};

  const t = (message || '').toString().trim();
  if (!t) return res.json({ success: false, error: 'Empty message' });

  let isCommand = false;
  let commandType = null;
  let commandData = null;

  // simple heuristic for Minecraft commands in the input
  const low = t.toLowerCase();
  if (low.startsWith('go to ') || low.startsWith('goto ') || /go\s+to\s+\d/.test(low)) {
    const match = t.match(/go\s+to\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/i) ||
                  t.match(/goto\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/i);
    if (match) {
      isCommand = true;
      commandType = 'force-task';
      commandData = {
        type: 'move',
        x: parseFloat(match[1]),
        y: parseFloat(match[2]),
        z: parseFloat(match[3])
      };
    }
  } else if (low.includes('dig') || low.includes('mine')) {
    isCommand = true;
    commandType = 'force-task';
    commandData = { type: 'mine', oreType: 'diamond' };
  } else if (low.includes('farm') || low.includes('grow')) {
    isCommand = true;
    commandType = 'force-task';
    commandData = { type: 'farm' };
  } else if (low.includes('build') || low.includes('construct')) {
    isCommand = true;
    commandType = 'force-task';
    commandData = { type: 'build' };
  } else if (low.includes('fight') || low.includes('combat') || low.includes('attack')) {
    isCommand = true;
    commandType = 'force-task';
    commandData = { type: 'attack' };
  } else if (low.includes('pause') || low.includes('stop')) {
    isCommand = true;
    commandType = 'pause';
  } else if (low.includes('resume') || low.includes('continue')) {
    isCommand = true;
    commandType = 'resume';
  }

  // ask AI for a response (this handles memory, personalities, rate limits, and fallback)
  let reply = '';
  try {
    reply = await conversationService.respond(playerName, t, personality);
  } catch (e) {
    logger.warn('AI chat failed', { error: e.message });
    reply = `Hmm... I'm having a bit of trouble thinking. Try again in a moment.`;
  }

  // if AI didn't produce text, fallback to generic hints for commands
  if (!reply) {
    reply = `I can help with mining, farming, building, combat, and navigation. What should I do?`;
  }

  // broadcast to connected socket clients
  try { io.emit('chat', `${aiName}: ${reply}`); } catch (e) { /* ignore */ }

  return res.json({
    success: true,
    message: reply,
    isCommand,
    commandType,
    commandData
  });
// In-memory toggle states (in production, persist to file or DB)
let featureToggles = {
  aiChat: true,
  farming: false,
  mining: false,
  combat: false,
  survival: true,
  building: false,
  crafting: false,
  inventory: true,
  pathfinding: true,
  learning: true
};

// Toggles API endpoints
app.get('/api/toggles', requireAuth, requireToken, (req, res) => {
  res.json(featureToggles);
});

app.post('/api/toggles', requireAuth, requireToken, (req, res) => {
  const { feature, enabled } = req.body;
  if (typeof enabled !== 'boolean' || !featureToggles.hasOwnProperty(feature)) {
    return res.status(400).json({ ok: false, error: 'Invalid feature or enabled value' });
  }
  
  featureToggles[feature] = enabled;
  
  // Emit toggle change to connected clients
  io.emit('toggle-changed', { feature, enabled });
  
  res.json({ ok: true, toggles: featureToggles });
});


io.on('connection', (socket) => {
  logger.info('Dashboard client connected');

  socket.on('control', (data) => {
    // Relay controls to bot
    logger.debug('Control event', data);
    socket.broadcast.emit('control', data);
  });

  socket.on('chat', (msg) => {
      logger.info('Chat from dashboard', msg);
  });

  socket.on('ai-command', (data) => {
    logger.debug('AI command from dashboard', data);
    socket.broadcast.emit('ai-command', data);
  });

  socket.on('goto', (payload) => {
    logger.debug('Goto event', payload);
    socket.broadcast.emit('goto', payload);
  });

  socket.on('buildcity', (type) => {
    socket.broadcast.emit('buildcity', type);
  });

  socket.on('disconnect', () => {
    logger.info('Dashboard client disconnected');
  });
});

const port = process.env.DASHBOARD_PORT || config.dashboard.port || 3333;
// bind to localhost only
server.listen(port, '127.0.0.1', () => {
  logger.info(`Dashboard server listening on http://127.0.0.1:${port}`);
});
