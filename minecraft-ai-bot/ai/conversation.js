import { OpenAI } from 'openai';
import logger from '../bot/logger.js';
import config from '../bot/config.js';

export default class Conversation {
  constructor(botName = '') {
    this.client = null;
    // map of playerName -> [{role,content},...]
    this.histories = new Map();
    this.spamTracker = new Map();
    // if provided, used for mention stripping in prompts
    this.botName = botName.toLowerCase();

    if (config.openai.apiKey) {
      this.client = new OpenAI({
        apiKey: config.openai.apiKey
      });
      logger.info('OpenAI client initialized');
    } else {
      logger.warn('OpenAI API key not configured');
    }
  }

  // simple spam detection: ignore if the same message is sent >2 times in short period
  isSpam(player, message) {
    const now = Date.now();
    const key = player.toLowerCase();
    const entry = this.spamTracker.get(key) || { last: '', count: 0, time: 0 };
    if (message === entry.last && now - entry.time < 15000) {
      entry.count++;
    } else {
      entry.last = message;
      entry.count = 1;
      entry.time = now;
    }
    this.spamTracker.set(key, entry);
    return entry.count > 2;
  }

  // retrieve or create history array for a given player
  _getHistory(player) {
    const key = player.toLowerCase();
    if (!this.histories.has(key)) {
      this.histories.set(key, []);
    }
    return this.histories.get(key);
  }

  async respond(player, message, personality = 'helpful') {
    if (!this.client) {
      return "I don't have AI capabilities configured. Set OPENAI_API_KEY in .env";
    }

    if (!player) player = 'unknown';
    const history = this._getHistory(player);
    const cleanMsg = message.trim();
    if (!cleanMsg) return '';

    // spam check
    if (this.isSpam(player, cleanMsg)) {
      return ''; // ignore spam silently
    }

    // add user message, keep last 40 entries (20 user + 20 assistant)
    history.push({ role: 'user', content: cleanMsg });
    if (history.length > 40) {
      history.splice(0, history.length - 40);
    }

    // build system prompt dynamically
    const systemPromptParts = [];
    systemPromptParts.push(`You are a Minecraft AI assistant`);
    systemPromptParts.push(`Personality: ${personality}`);
    systemPromptParts.push(`You are inside a Minecraft world and can perform actions.`);
    systemPromptParts.push(`When it makes sense, suggest a command starting with "!" to the player.`);
    if (this.botName) {
      systemPromptParts.push(`Your name is ${this.botName}.`);
    }
    const systemPrompt = systemPromptParts.join(' ');

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history
    ];

    try {
      const model = config.openai.model || 'gpt-4o-mini';
      const response = await this.client.chat.completions.create({
        model,
        messages,
        max_tokens: 200,
        temperature: 0.7
      });

      const assistantMessage = response?.choices?.[0]?.message?.content?.trim() || '';
      // record assistant reply
      history.push({ role: 'assistant', content: assistantMessage });
      if (history.length > 40) {
        history.splice(0, history.length - 40);
      }
      logger.debug('AI response generated', { player, messageLength: assistantMessage.length });
      return assistantMessage;
    } catch (err) {
      logger.error('OpenAI API error', { error: err.message });
      // graceful fallback
      return 'Sorry, I am having trouble thinking right now. Try again in a moment.';
    }
  }

  getHistory(player) {
    return this._getHistory(player);
  }

  clearHistory(player) {
    if (!player) return;
    this.histories.set(player.toLowerCase(), []);
  }
}
