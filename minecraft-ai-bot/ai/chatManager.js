import logger from '../bot/logger.js';

// chatManager orchestrates when the bot should talk back to players.
// It uses a Conversation instance (which handles memory / OpenAI calls)
// and applies mention detection, !ask prefix, DM heuristics, and spam filtering.

export default class ChatManager {
  constructor(bot, conversation, options = {}) {
    this.bot = bot;
    this.conversation = conversation;
    this.botName = (bot && bot.username) ? bot.username.toLowerCase() : '';
    this.defaultPersonality = options.defaultPersonality || 'helpful';

    // simple in-memory tracker for repeated messages per player
    this.spamData = new Map();
    // per-player timestamps for rate limiting
    this.rateData = new Map();
    this.rateLimit = options.rateLimit || { windowMs: 10000, max: 5 };
  }

  // check if message should be ignored as spam
  _isSpam(player, message) {
    const now = Date.now();
    const key = player.toLowerCase();
    const entry = this.spamData.get(key) || { last: '', count: 0, time: 0 };
    if (message === entry.last && now - entry.time < 15000) {
      entry.count++;
    } else {
      entry.last = message;
      entry.count = 1;
      entry.time = now;
    }
    this.spamData.set(key, entry);
    // if same message repeated more than twice in 15 seconds we consider it spam
    return entry.count > 2;
  }

  // simple rate limiter per player
  _isRateLimited(player) {
    const now = Date.now();
    const key = player.toLowerCase();
    const entry = this.rateData.get(key) || [];
    const recent = entry.filter(ts => now - ts < this.rateLimit.windowMs);
    if (recent.length >= this.rateLimit.max) {
      this.rateData.set(key, recent);
      return true;
    }
    recent.push(now);
    this.rateData.set(key, recent);
    return false;
  }

  // determine whether the bot should respond to this chat line
  _triggers(message) {
    const low = message.toLowerCase();
    const mentions = this.botName && low.includes(this.botName);
    const askCmd = low.startsWith('!ask');
    const direct = low.includes(`-> ${this.botName}`) ||
      low.startsWith(`${this.botName}:`) ||
      low.startsWith(`${this.botName},`);
    return mentions || askCmd || direct;
  }

  async handleChat(username, message) {
    if (!this.bot || username === this.bot.username) return;
    if (!message || typeof message !== 'string') return;

    if (this._isSpam(username, message)) {
      logger.debug('Ignored spammy message from', { username, message });
      return;
    }

    if (this._isRateLimited(username)) {
      logger.warn('Rate limit exceeded for', username);
      try { this.bot.chat("Slow down a bit please, I'm thinking..."); } catch {};
      return;
    }

    if (!this._triggers(message)) {
      // not addressed to us
      return;
    }

    // clean up user text: remove bot name, remove !ask prefix
    let clean = message.replace(new RegExp(this.botName, 'ig'), '').trim();
    if (clean.toLowerCase().startsWith('!ask')) {
      clean = clean.replace(/^!ask\s*/i, '').trim();
    }

    // nothing left to ask
    if (!clean) return;

    const personality = this.defaultPersonality;
    try {
      const reply = await this.conversation.respond(username, clean, personality);
      if (reply) {
        // send only if not empty (spam-check may return '')
        this.bot.chat(reply);
      }
    } catch (err) {
      logger.error('ChatManager error generating reply', { error: err.message });
      try {
        this.bot.chat("Sorry, I'm having trouble thinking right now.");
      } catch {};
    }
  }
}
