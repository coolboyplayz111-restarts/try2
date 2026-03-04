/* ============================================================================
                    MINECRAFT AI BOT - DASHBOARD JAVASCRIPT
                       Enhanced Dashboard Application
   ============================================================================ */

const socket = io();
let currentUser = null;
let botStatus = { online: false, position: null };

/* ============================================================================
                            SETTINGS MANAGER
   ============================================================================ */

const settingsManager = {
  defaults: {
    // General (kebab-case IDs must match HTML)
    'bot-name': 'AIBot',
    'auto-save': true,
    'max-memory': 10000,
    'auto-reconnect': true,
    'max-reconnect': 50,
    // AI Behavior
    'aggression': 50,
    'caution': 50,
    'exploration': 50,
    'strategy': 'balanced',
    'enable-learning': true,
    // Survival
    'auto-eat': true,
    'min-hunger': 10,
    'night-shelter': true,
    'min-health': 5,
    'combat-diff': 'normal',
    // Display
    'theme': 'dark',
    'accent-color': '#4cc2ff',
    'chat-font-size': 14,
    'show-radar': true,
    'mobile-sidebar': true,
    'compact-view': false,
    // Notifications
    'notify-chat': true,
    'notify-health': true,
    'notify-hunger': true,
    'notify-enemy': true,
    'notify-connection': true,
    'notify-sound': false,
    // Advanced
    'perception-interval': 2000,
    'memory-interval': 5000,
    'console-log': false,
    'enable-profiling': false,
    // Integrations / Extra settings
    'enable-webhook': false,
    'webhook-url': '',
    'enable-backup': false,
    'backup-interval': 3600,
    'backup-location': '',
    'allow-remote-commands': false,
    'admin-users': ''
  },

  load() {
    const saved = localStorage.getItem('botDashboardSettings');
    return saved ? JSON.parse(saved) : this.defaults;
  },

  save(settings) {
    localStorage.setItem('botDashboardSettings', JSON.stringify(settings));
  },

  get(key) {
    const settings = this.load();
    return settings[key] !== undefined ? settings[key] : this.defaults[key];
  },

  set(key, value) {
    const settings = this.load();
    settings[key] = value;
    this.save(settings);
    return settings;
  },

  reset() {
    this.save(this.defaults);
    return this.defaults;
  },

  export() {
    return JSON.stringify(this.load(), null, 2);
  },

  import(jsonString) {
    try {
      const settings = JSON.parse(jsonString);
      this.save(settings);
      return true;
    } catch (e) {
      return false;
    }
  }
};

/* ============================================================================
                            HELP CONTENT DATABASE
   ============================================================================ */

const helpDatabase = {
  'getting-started': {
    title: '🚀 Getting Started',
    content: `
      <div class="help-section">
        <h3>Welcome to Minecraft AI Bot</h3>
        <p>Your AI-powered Minecraft automation assistant is ready to go! Here's how to get started:</p>
        
        <h3>Initial Setup</h3>
        <ol>
          <li>Log in with your credentials (default: admin / admin123)</li>
          <li>Navigate to the <strong>Settings</strong> page to configure bot behavior</li>
          <li>Use the <strong>Dashboard</strong> to monitor bot status and activity</li>
          <li>Switch to <strong>Controls</strong> to manually command the bot</li>
        </ol>

        <h3>Main Features</h3>
        <ul>
          <li><strong>Dashboard:</strong> Real-time status monitoring</li>
          <li><strong>Chat:</strong> Communicate with the bot and server</li>
          <li><strong>Controls:</strong> Manual movement and command execution</li>
          <li><strong>City Builder:</strong> Automated city construction</li>
          <li><strong>Settings:</strong> Customize AI behavior and appearance</li>
        </ul>

        <h3>Next Steps</h3>
        <p>Check out the other help sections for detailed guides on each feature.</p>
      </div>
    `
  },

  'dashboard': {
    title: '📊 Dashboard Guide',
    content: `
      <div class="help-section">
        <h3>Dashboard Overview</h3>
        <p>The Dashboard is your command center for monitoring the bot's status.</p>

        <h3>Status Panel</h3>
        <p>Displays real-time information:</p>
        <ul>
          <li><strong>Health:</strong> Current health points (0-20)</li>
          <li><strong>Hunger:</strong> Hunger level (0-20)</li>
          <li><strong>XP Level:</strong> Experience level</li>
          <li><strong>Position:</strong> Current coordinates (X, Y, Z)</li>
          <li><strong>Current Task:</strong> Active AI task</li>
          <li><strong>Dimension:</strong> Current world dimension</li>
        </ul>

        <h3>Chat Panel</h3>
        <p>Communicate with the bot and monitor chat messages. Messages are color-coded:</p>
        <ul>
          <li><strong>Blue:</strong> Regular chat messages</li>
          <li><strong>Green:</strong> System messages</li>
          <li><strong>Red:</strong> Error messages</li>
        </ul>

        <h3>Inventory Panel</h3>
        <p>Visual representation of the bot's inventory. Click items for details.</p>

        <h3>Entity Radar</h3>
        <p>Visual map showing nearby entities, players, and mobs around the bot.</p>
      </div>
    `
  },

  'controls': {
    title: '🎮 Controls & Commands',
    content: `
      <div class="help-section">
        <h3>Manual Controls</h3>
        <p>Use these buttons to manually control the bot's movement:</p>
        <ul>
          <li><strong>W / Forward:</strong> Move forward</li>
          <li><strong>A / Left:</strong> Strafe left</li>
          <li><strong>S / Back:</strong> Move backward</li>
          <li><strong>D / Right:</strong> Strafe right</li>
          <li><strong>Space / Jump:</strong> Jump</li>
          <li><strong>Shift / Sneak:</strong> Sneak (prevents falling off edges)</li>
        </ul>

        <h3>Quick Commands</h3>
        <p>Pre-set commands for common actions:</p>
        <ul>
          <li><strong>!status</strong> - Get bot status</li>
          <li><strong>!inventory</strong> - Show inventory contents</li>
          <li><strong>!mine [type]</strong> - Start mining for specific ore</li>
          <li><strong>!goto [x] [z]</strong> - Navigate to coordinates</li>
        </ul>

        <h3>Chat Commands</h3>
        <p>You can also send commands via the chat panel. Commands starting with ! are processed as bot commands.</p>
      </div>
    `
  },

  'builder': {
    title: '🏗️ City Builder',
    content: `
      <div class="help-section">
        <h3>City Builder Overview</h3>
        <p>Automatically construct complete cities with the AI bot.</p>

        <h3>Available City Types</h3>
        <ul>
          <li><strong>Village:</strong> Small settlement with houses and farms</li>
          <li><strong>Medieval:</strong> Castle, towers, and medieval-style structures</li>
          <li><strong>Modern:</strong> Contemporary buildings with grid layout</li>
        </ul>

        <h3>How to Build</h3>
        <ol>
          <li>Navigate to the <strong>City Builder</strong> page</li>
          <li>Select your desired city type</li>
          <li>Click the build button</li>
          <li>Monitor progress in the build history</li>
        </ol>

        <h3>Build History</h3>
        <p>Track all completed and in-progress city constructions. View timestamps and structure details.</p>

        <h3>Tips</h3>
        <ul>
          <li>Clear an area before building for best results</li>
          <li>Ensure the bot has enough materials</li>
          <li>Medieval builds take longer than villages</li>
          <li>Modern builds offer quickest construction</li>
        </ul>
      </div>
    `
  },

  'ai-system': {
    title: '🧠 AI System',
    content: `
      <div class="help-section">
        <h3>AI System Overview</h3>
        <p>The bot uses an advanced AI system to autonomously manage survival and accomplish tasks.</p>

        <h3>AI Components</h3>
        <ul>
          <li><strong>Perception:</strong> Scans environment for blocks, entities, and resources</li>
          <li><strong>Memory:</strong> Stores locations, learned behaviors, and player interactions</li>
          <li><strong>Planning:</strong> Creates task priorities and execution plans</li>
          <li><strong>Learning:</strong> Adapts based on player commands and interactions</li>
          <li><strong>Strategy:</strong> Adjusts approach based on situations</li>
        </ul>

        <h3>Customization</h3>
        <p>Configure AI behavior in <strong>Settings → AI Behavior</strong>:</p>
        <ul>
          <li><strong>Aggression:</strong> Combat tendency (0-100%)</li>
          <li><strong>Caution:</strong> Risk avoidance (0-100%)</li>
          <li><strong>Exploration:</strong> Desire to explore (0-100%)</li>
          <li><strong>Strategy:</strong> Balanced, Aggressive, Defensive, or Cautious</li>
        </ul>

        <h3>Task Priority System</h3>
        <p>AI prioritizes tasks in this order:</p>
        <ol>
          <li>Survival (eating, shelter, avoiding danger)</li>
          <li>Defense (combat when threatened)</li>
          <li>Gathering (mining, farming, collecting)</li>
          <li>Building (constructing structures)</li>
          <li>Exploration (discovering new areas)</li>
        </ol>
      </div>
    `
  },

  'faq': {
    title: '❓ Frequently Asked Questions',
    content: `
      <div class="help-section">
        <h3>Frequently Asked Questions</h3>

        <div class="faq-item">
          <strong>Q: How do I change the bot's behavior?</strong>
          <p>A: Go to Settings → AI Behavior to adjust aggression, caution, exploration, and strategy settings.</p>
        </div>

        <div class="faq-item">
          <strong>Q: Can I control the bot manually?</strong>
          <p>A: Yes! Use the Controls page for manual movement, or the Chat panel for commands.</p>
        </div>

        <div class="faq-item">
          <strong>Q: How does the bot gather resources?</strong>
          <p>A: The AI perception system scans for ores and resources, prioritizes them, and mines them autonomously.</p>
        </div>

        <div class="faq-item">
          <strong>Q: What's the memory limit?</strong>
          <p>A: Configurable in Settings → General. Default is 10,000 entries. Older entries are archived.</p>
        </div>

        <div class="faq-item">
          <strong>Q: Can I export my settings?</strong>
          <p>A: Yes! Use Settings → Advanced → Export Settings to save your configuration as JSON.</p>
        </div>

        <div class="faq-item">
          <strong>Q: What's the difference between combat difficulties?</strong>
          <p>A: Easy: Avoids combat. Normal: Balances offense/defense. Hard: Aggressive combat tactics.</p>
        </div>

        <div class="faq-item">
          <strong>Q: How do I change the dashboard theme?</strong>
          <p>A: Go to Settings → Display and select your preferred theme (Dark, Light, Cyberpunk, Forest).</p>
        </div>

        <div class="faq-item">
          <strong>Q: Can I import settings from a file?</strong>
          <p>A: Yes! Use Settings → Advanced → Import Settings to load previously exported configurations.</p>
        </div>
      </div>
    `
  },

  'troubleshooting': {
    title: '🔧 Troubleshooting',
    content: `
      <div class="help-section">
        <h3>Common Issues & Solutions</h3>

        <div class="faq-item">
          <strong>Issue: Bot appears offline</strong>
          <p>Solution: Check connection status badge in header. Ensure bot process is running. Check server logs for connection errors. Try reconnecting from Settings.</p>
        </div>

        <div class="faq-item">
          <strong>Issue: Commands not executing</strong>
          <p>Solution: Verify bot is online. Check if command syntax is correct. Ensure bot has required permissions on the server.</p>
        </div>

        <div class="faq-item">
          <strong>Issue: Inventory not updating</strong>
          <p>Solution: Force refresh the page. Check if inventory update interval needs adjustment in Settings → Advanced.</p>
        </div>

        <div class="faq-item">
          <strong>Issue: Low FPS / Dashboard lag</strong>
          <p>Solution: Enable Compact View in Display settings. Disable Entity Radar if not needed. Close other resource-heavy tabs.</p>
        </div>

        <div class="faq-item">
          <strong>Issue: Settings not saving</strong>
          <p>Solution: Check browser's localStorage is enabled. Try resetting with Settings → Advanced → Reset to Defaults.</p>
        </div>

        <div class="faq-item">
          <strong>Issue: City Builder takes too long</strong>
          <p>Solution: Modern buildings are fastest. Reduce other AI tasks. Ensure clear building area. Check available materials.</p>
        </div>

        <div class="faq-item">
          <strong>Issue: Chat messages not appearing</strong>
          <p>Solution: Check notification settings are enabled. Verify Socket.io connection is active (green badge).</p>
        </div>

        <div class="faq-item">
          <strong>Issue: Theme not applying</strong>
          <p>Solution: Try hard refresh (Ctrl+Shift+R). Clear localStorage and reimport settings.</p>
        </div>
      </div>
    `
  }
};

/* ============================================================================
                            PAGE MANAGEMENT
   ============================================================================ */

const pageManager = {
  current: 'login',
  login: 'login-page',
  dashboard: 'dashboard-page',
  controls: 'controls-page',
  builder: 'builder-page',
  settings: 'settings-page',
  help: 'help-page',

  init() {
    // Navigation click handlers
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        this.show(page);
      });
    });

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', async () => {
      try {
        await fetch('/logout', { method: 'POST' });
      } catch (e) {
        console.warn('Logout request failed', e);
      }
      this.show('login');
      currentUser = null;
    });
  },

  show(page) {
    if (!this[page]) return;
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Show selected page
    const pageEl = document.getElementById(this[page]);
    if (pageEl) pageEl.classList.add('active');
    
    // Update nav active state
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });
    
    this.current = page;
  }
};

/* ============================================================================
                            LOGIN MANAGEMENT
   ============================================================================ */

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (res.ok) {
      currentUser = username;
      pageManager.show('dashboard');
      initializeDashboard();
    } else {
      showNotification('Login failed', 'error');
    }
  } catch (err) {
    showNotification('Connection error', 'error');
  }
});

/* ============================================================================
                        DASHBOARD INITIALIZATION
   ============================================================================ */

function initializeDashboard() {
  // Apply saved theme
  applyTheme(settingsManager.get('theme'));
  
  // Setup socket listeners
  setupSocketListeners();
  
  // Start status updates
  startStatusUpdates();
  
  // Initialize inventory
  initInventory();
  
  // Initialize radar
  initRadar();
}

function setupSocketListeners() {
  socket.on('connect', () => {
    updateConnectionStatus(true);
    showNotification('Connected to bot', 'success');
  });

  socket.on('disconnect', () => {
    updateConnectionStatus(false);
    if (settingsManager.get('notify-connection')) {
      showNotification('Disconnected from bot', 'error');
    }
  });

  socket.on('status', (status) => {
    updateBotStatus(status);
  });

  socket.on('chat', (msg) => {
    addChatMessage(msg);
  });

  socket.on('ai-command', (data) => {
    // Display AI command responses or events
    const text = typeof data === 'string' ? data : (data.response || data.command || JSON.stringify(data));
    addChatMessage(`🤖 AI: ${text}`);
  });

  socket.on('inventory', (inventory) => {
    updateInventory(inventory);
  });

  socket.on('entity-data', (entities) => {
    updateRadar(entities);
  });
}

function startStatusUpdates() {
  setInterval(() => {
    if (botStatus.online) {
      // Update status displays
      socket.emit('request-status');
    }
  }, 1000);
}

/* ============================================================================
                        STATUS & DISPLAY UPDATES
   ============================================================================ */

function updateConnectionStatus(online) {
  const badge = document.getElementById('connection-status');
  const position = document.getElementById('bot-position');
  
  botStatus.online = online;
  badge.classList.toggle('connected', online);
  badge.classList.toggle('disconnected', !online);
  badge.innerText = online ? '● Online' : '● Offline';
}

function updateBotStatus(status) {
  if (!status) return;
  
  botStatus = { ...botStatus, ...status };
  
  document.getElementById('health-value').innerText = status.health ? `${status.health}/20` : '—';
  document.getElementById('hunger-value').innerText = status.hunger ? `${status.hunger}/20` : '—';
  document.getElementById('xp-value').innerText = status.xp || '—';
  document.getElementById('position-value').innerText = status.position 
    ? `${Math.round(status.position.x)}, ${Math.round(status.position.y)}, ${Math.round(status.position.z)}`
    : '—';
  document.getElementById('task-value').innerText = status.task || 'idle';
  document.getElementById('dimension-value').innerText = status.dimension || '—';
  
  // Update header position
  if (status.position) {
    document.getElementById('bot-position').innerText = 
      `📍 ${Math.round(status.position.x)}, ${Math.round(status.position.z)}`;
  }
  
  // Alert if health low
  if (status.health && status.health < settingsManager.get('minHealth') && settingsManager.get('notifyHealth')) {
    if (settingsManager.get('notify-health')) {
      showNotification(`Health low: ${status.health}/20`, 'warning');
    }
  }
}

function addChatMessage(msg) {
  const chatLog = document.getElementById('chat-log');
  const msgEl = document.createElement('div');
  msgEl.className = 'chat-message';
  msgEl.innerText = msg;
  chatLog.appendChild(msgEl);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function showNotification(text, type = 'info') {
  // Simple notification (can be enhanced with toast library)
  console.log(`[${type.toUpperCase()}] ${text}`);
}

/* ============================================================================
                            INVENTORY SYSTEM
   ============================================================================ */

function initInventory() {
  const grid = document.getElementById('inventory-grid');
  grid.innerHTML = '';
  for (let i = 0; i < 36; i++) {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    slot.dataset.slot = i;
    slot.title = `Slot ${i}`;
    grid.appendChild(slot);
  }
}

function updateInventory(inventory) {
  if (!inventory) return;
  const slots = document.querySelectorAll('.inventory-slot');
  
  inventory.forEach((item, index) => {
    if (slots[index] && item) {
      slots[index].innerHTML = `<span>${item.name}</span><small>×${item.count}</small>`;
      slots[index].classList.add('filled');
    }
  });
  
  document.getElementById('inv-info').innerText = `${inventory.filter(i => i).length}/36 slots filled`;
}

/* ============================================================================
                          ENTITY RADAR
   ============================================================================ */

function initRadar() {
  const canvas = document.getElementById('radar-canvas');
  const ctx = canvas.getContext('2d');
  
  // Draw default radar
  drawRadar(ctx, canvas);
}

function drawRadar(ctx, canvas) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = canvas.width / 2 - 10;
  
  // Background
  ctx.fillStyle = '#0f1117';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Grid
  ctx.strokeStyle = 'rgba(76, 194, 255, 0.2)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const r = (radius / 3) * i;
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // Cardinal directions
  ctx.fillStyle = 'rgba(76, 194, 255, 0.5)';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', centerX, 15);
  ctx.fillText('S', centerX, canvas.height - 5);
  
  // Center (bot position)
  ctx.fillStyle = '#4cc2ff';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
  ctx.fill();
}

function updateRadar(entities) {
  const canvas = document.getElementById('radar-canvas');
  const ctx = canvas.getContext('2d');
  
  drawRadar(ctx, canvas);
  
  if (!entities || entities.length === 0) {
    document.getElementById('radar-info').innerText = 'No nearby entities';
    return;
  }
  
  // Draw entities
  entities.forEach(entity => {
    const x = canvas.width / 2 + (entity.dx / 32) * (canvas.width / 2);
    const y = canvas.height / 2 + (entity.dz / 32) * (canvas.height / 2);
    
    ctx.fillStyle = getEntityColor(entity.type);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  
  document.getElementById('radar-info').innerText = `Nearby entities: ${entities.length}`;
}

function getEntityColor(type) {
  const colors = {
    player: '#ffff00',
    mob: '#ff6b6b',
    item: '#4cc2ff',
    animal: '#51cf66',
    hostile: '#ff0000'
  };
  return colors[type] || '#4cc2ff';
}

/* ============================================================================
                            CONTROLS
   ============================================================================ */

// Movement controls
document.querySelectorAll('.control-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const control = btn.dataset.control;
    socket.emit('control', { control, value: true });
    
    // Visual feedback
    btn.style.opacity = '0.5';
    setTimeout(() => { btn.style.opacity = '1'; }, 200);
  });
});

// Quick commands
document.querySelectorAll('.cmd-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const cmd = btn.dataset.cmd;
    socket.emit('chat', cmd);
  });
});

// City builder
document.querySelectorAll('.build-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.build;
    socket.emit('buildcity', type);
    showNotification(`Starting ${type} build...`);
  });
});

// Chat
document.getElementById('send-chat').addEventListener('click', () => {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (text) {
    socket.emit('chat', text);
    input.value = '';
  }
});

document.getElementById('chat-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('send-chat').click();
  }
});

// Send as AI command (special)
const sendAiBtn = document.getElementById('send-ai');
if (sendAiBtn) {
  sendAiBtn.addEventListener('click', () => {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (text) {
      socket.emit('ai-command', { command: text, user: currentUser || 'dashboard' });
      addChatMessage(`→ AI Command: ${text}`);
      input.value = '';
    }
  });
}

/* ============================================================================
                          SETTINGS MANAGEMENT
   ============================================================================ */

function initializeSettings() {
  const settings = settingsManager.load();
  
  // Load all settings into form
  Object.keys(settings).forEach(key => {
    const el = document.getElementById(key);
    if (el) {
      if (el.type === 'checkbox') {
        el.checked = settings[key];
      } else if (el.type === 'number' || el.type === 'text') {
        el.value = settings[key];
      } else if (el.type === 'color') {
        el.value = settings[key];
      } else if (el.tagName === 'SELECT') {
        el.value = settings[key];
      }
    }
  });
  
  // Range slider handlers
  document.getElementById('aggression').addEventListener('input', (e) => {
    document.getElementById('aggression-value').innerText = e.target.value + '%';
  });
  document.getElementById('caution').addEventListener('input', (e) => {
    document.getElementById('caution-value').innerText = e.target.value + '%';
  });
  document.getElementById('exploration').addEventListener('input', (e) => {
    document.getElementById('exploration-value').innerText = e.target.value + '%';
  });
  
  // Settings section navigation
  document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const section = item.dataset.section;
      switchSettingsSection(section);
    });
  });
  
  // Save settings
  document.getElementById('save-settings').addEventListener('click', () => {
    const settings = {};
    document.querySelectorAll('[id]').forEach(el => {
      const id = el.id;
      if (settingsManager.defaults.hasOwnProperty(id)) {
        if (el.type === 'checkbox') {
          settings[id] = el.checked;
        } else {
          settings[id] = el.value;
        }
      }
    });
    settingsManager.save(settings);
    applyTheme(settings.theme);
    showNotification('Settings saved!', 'success');
  });
  
  // Reset settings
  document.getElementById('reset-settings').addEventListener('click', () => {
    if (confirm('Reset all settings to defaults?')) {
      settingsManager.reset();
      initializeSettings();
      showNotification('Settings reset to defaults', 'success');
    }
  });
  
  // Export settings
  document.getElementById('export-settings').addEventListener('click', () => {
    const json = settingsManager.export();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bot-settings.json';
    a.click();
  });
  
  // Import settings
  document.getElementById('import-settings').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (settingsManager.import(ev.target.result)) {
          initializeSettings();
          showNotification('Settings imported successfully!', 'success');
        } else {
          showNotification('Invalid settings file', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

function switchSettingsSection(section) {
  document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`${section}-section`).classList.add('active');
  
  document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === section);
  });
}

function applyTheme(theme) {
  document.body.className = '';
  if (theme && theme !== 'dark') {
    document.body.classList.add(`theme-${theme}`);
  }
}

/* ============================================================================
                          HELP SYSTEM
   ============================================================================ */

function initializeHelp() {
  // Help navigation
  document.querySelectorAll('.help-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const topic = item.dataset.topic;
      showHelpTopic(topic);
    });
  });
  
  // Help search
  document.getElementById('help-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    searchHelp(query);
  });
  
  // Show first topic
  showHelpTopic('getting-started');
}

function showHelpTopic(topic) {
  const data = helpDatabase[topic];
  if (!data) return;
  
  const content = document.getElementById('help-content');
  content.innerHTML = data.content;
  
  document.querySelectorAll('.help-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.topic === topic);
  });
}

function searchHelp(query) {
  if (!query) {
    document.querySelectorAll('.help-nav-item').forEach(item => {
      item.style.display = '';
    });
    return;
  }
  
  document.querySelectorAll('.help-nav-item').forEach(item => {
    const text = item.innerText.toLowerCase();
    const match = text.includes(query) || helpDatabase[item.dataset.topic].content.toLowerCase().includes(query);
    item.style.display = match ? '' : 'none';
  });
}

/* ============================================================================
                          INITIALIZATION
   ============================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  pageManager.init();
  initializeSettings();
  initializeHelp();
});
