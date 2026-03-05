/**
 * Test telemetry emitter for dashboard testing
 * Sends fake bot telemetry to verify the dashboard and Live AI Feed work
 */

import { io } from 'socket.io-client';

// Connect to dashboard server
const socket = io('http://127.0.0.1:3000', {
  auth: {
    token: 'changeme' // default token from config
  }
});

socket.on('connect', () => {
  console.log('✓ Connected to dashboard server');

  // Emit sample telemetry every second
  const interval = setInterval(() => {
    const telemetry = {
      bot: {
        username: 'TestBot',
        connected: true,
        server: 'test.local:25565',
        ping: Math.random() * 50 + 20
      },
      position: {
        x: Math.random() * 100 + 50,
        y: 65,
        z: Math.random() * 100 + 50,
        dimension: 'overworld'
      },
      stats: {
        health: Math.random() * 20,
        food: Math.random() * 20,
        xp: Math.floor(Math.random() * 50),
        armor: 0,
        toolDurability: null
      },
      movement: {
        state: Math.random() > 0.5 ? 'moving' : 'idle',
        speed: Math.random() * 5,
        target: null
      },
      inventory: [
        { name: 'diamond_ore', count: Math.floor(Math.random() * 64) },
        { name: 'stone', count: Math.floor(Math.random() * 64) },
        { name: 'coal_ore', count: Math.floor(Math.random() * 32) }
      ],
      ai: {
        currentGoal: ['mine', 'farm', 'explore', 'build'][Math.floor(Math.random() * 4)],
        targetBlock: ['diamond', 'iron', 'coal'][Math.floor(Math.random() * 3)],
        confidence: 0.85,
        structures: ['starterHouse','farm','tower']
      },
      perception: {
        hostileMobs: [
          ...(Math.random() > 0.6
            ? [
                {
                  type: 'creeper',
                  position: {
                    x: Math.random() * 50 - 25,
                    y: 64,
                    z: Math.random() * 50 - 25
                  }
                }
              ]
            : [])
        ],
        passiveMobs: [
          {
            type: 'cow',
            position: {
              x: Math.random() * 50 - 25,
              y: 63,
              z: Math.random() * 50 - 25
            }
          }
        ],
        players: [
          {
            name: 'PlayerOne',
            position: {
              x: Math.random() * 30 - 15,
              y: 64,
              z: Math.random() * 30 - 15
            }
          }
        ],
        ores: [
          {
            type: 'diamond_ore',
            position: {
              x: Math.random() * 40 - 20,
              y: Math.floor(Math.random() * 10 + 5),
              z: Math.random() * 40 - 20
            }
          },
          {
            type: 'iron_ore',
            position: {
              x: Math.random() * 40 - 20,
              y: Math.floor(Math.random() * 20 + 20),
              z: Math.random() * 40 - 20
            }
          }
        ],
        blocks: {
          crops: [
            { name: 'wheat', position: { x: 5, y: 64, z: 5 }, metadata: 7 },
            { name: 'carrots', position: { x: -3, y: 64, z: 2 }, metadata: 7 }
          ]
        }
      },
      viewerPort: 3001,
      performance: {
        cpu: { user: 100000, system: 50000 },
        memory: { heapUsed: 50000000, heapTotal: 150000000 },
        tickRate: 20
      },
      timestamp: Date.now()
    };

    socket.emit('telemetry', telemetry);
  }, 1000);

  // Stop after 30 seconds
  setTimeout(() => {
    clearInterval(interval);
    console.log('Test telemetry stopped.');
    socket.disconnect();
    process.exit(0);
  }, 30000);
});

socket.on('connect_error', (err) => {
  console.error('✗ Connection error:', err.message);
  process.exit(1);
});

socket.on('disconnect', () => {
  console.log('Disconnected from dashboard');
});
