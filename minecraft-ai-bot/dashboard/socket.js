import { Server as SocketIOServer } from 'socket.io';
import logger from '../bot/logger.js';

let io = null;

export function initializeSocket(server) {
  io = new SocketIOServer(server);

  io.on('connection', (socket) => {
    logger.info('Socket client connected');

    socket.on('control', (data) => {
      // Emit control to listeners
      io.emit('control', data);
    });

    socket.on('chat', (data) => {
      io.emit('chat', data);
    });

    socket.on('ai-command', (data) => {
      // Relay AI command events to all listeners (bot/processes)
      io.emit('ai-command', data);
    });

    socket.on('buildcity', (type) => {
      io.emit('buildcity', type);
    });

    socket.on('disconnect', () => {
      logger.info('Socket client disconnected');
    });
  });

  return io;
}

export function getSocket() {
  return io;
}
