import { Server, Socket } from 'socket.io';
import { RoomManager } from '../game/RoomManager';
import { GameSettings } from '../types/game';
import { logger } from '../utils/logger';

export function setupSocketHandlers(io: Server, roomManager: RoomManager) {
  io.on('connection', (socket: Socket) => {
    logger.debug(`Client connected: ${socket.id}`);

    // Create Room
    socket.on('createRoom', (data: { playerName: string; settings: GameSettings }, callback) => {
      try {
        const roomCode = roomManager.createRoom(socket.id, data.playerName, data.settings);
        socket.join(roomCode);
        
        const room = roomManager.getRoom(roomCode);
        if (room) {
          callback({ success: true, roomCode, gameState: room.getState() });
        }
      } catch (error) {
        callback({ success: false, error: 'Failed to create room' });
      }
    });

    // Join Room
    socket.on('joinRoom', (data: { roomCode: string; playerName: string }, callback) => {
      try {
        const room = roomManager.getRoom(data.roomCode);
        if (!room) {
          callback({ success: false, error: 'Room not found' });
          return;
        }

        const success = room.addPlayer(socket.id, data.playerName);
        if (!success) {
          callback({ success: false, error: 'Cannot join room (full or game started)' });
          return;
        }

        socket.join(data.roomCode);
        callback({ success: true, gameState: room.getState() });

        // Notify all players in room
        io.to(data.roomCode).emit('playerJoined', {
          players: room.getState().players
        });
      } catch (error) {
        callback({ success: false, error: 'Failed to join room' });
      }
    });

    // Start Game
    socket.on('startGame', (callback) => {
      try {
        const result = roomManager.getRoomByPlayerId(socket.id);
        if (!result) {
          callback({ success: false, error: 'Room not found' });
          return;
        }

        const { roomCode, room } = result;
        const state = room.getState();

        if (state.hostId !== socket.id) {
          callback({ success: false, error: 'Only host can start game' });
          return;
        }

        const success = room.startGame();
        if (!success) {
          callback({ success: false, error: 'Cannot start game' });
          return;
        }

        callback({ success: true });
        io.to(roomCode).emit('gameStarted', { gameState: room.getState() });

        // Start turn timer only if game started successfully
        const newState = room.getState();
        if (newState.gamePhase === 'playing') {
          startTurnTimer(io, roomCode, room);
        }
      } catch (error) {
        callback({ success: false, error: 'Failed to start game' });
      }
    });

    // Draw Card
    socket.on('drawCard', (data: { source: 'deck' | 'discard' }, callback) => {
      try {
        const result = roomManager.getRoomByPlayerId(socket.id);
        if (!result) {
          callback({ success: false, error: 'Room not found' });
          return;
        }

        const { roomCode, room } = result;
        const card = room.drawCard(socket.id, data.source);

        if (!card) {
          callback({ success: false, error: 'Cannot draw card' });
          return;
        }

        callback({ success: true, card });
        
        // Update all players
        io.to(roomCode).emit('gameStateUpdate', { gameState: room.getState() });

        // Restart turn timer for next player only if still in playing phase
        const afterDrawState = room.getState();
        if (afterDrawState.gamePhase === 'playing') {
          startTurnTimer(io, roomCode, room);
        }
      } catch (error) {
        callback({ success: false, error: 'Failed to draw card' });
      }
    });

    // Discard Cards
    socket.on('discardCards', (data: { cardIds: string[] }, callback) => {
      try {
        const result = roomManager.getRoomByPlayerId(socket.id);
        if (!result) {
          callback({ success: false, error: 'Room not found' });
          return;
        }

        const { roomCode, room } = result;
        const success = room.discardCards(socket.id, data.cardIds);

        if (!success) {
          callback({ success: false, error: 'Cannot discard cards' });
          return;
        }

        callback({ success: true });
        
        // Update all players
        io.to(roomCode).emit('gameStateUpdate', { gameState: room.getState() });

        // Don't restart timer - player still needs to draw
      } catch (error) {
        callback({ success: false, error: 'Failed to discard cards' });
      }
    });

    // Call Show
    socket.on('callShow', (callback) => {
      try {
        const result = roomManager.getRoomByPlayerId(socket.id);
        if (!result) {
          callback({ success: false, error: 'Room not found' });
          return;
        }

        const { roomCode, room } = result;
        
        // Clear any active timer when show is called
        const existingTimer = turnTimers.get(roomCode);
        if (existingTimer) {
          clearTimeout(existingTimer);
          turnTimers.delete(roomCode);
        }
        
        const roundEndData = room.callShow(socket.id);

        if (!roundEndData) {
          callback({ success: false, error: 'Cannot call show (hand value > 10 or not your turn)' });
          return;
        }

        callback({ success: true });
        
        // Notify all players about round end
        io.to(roomCode).emit('roundEnded', roundEndData);
        
        // Send updated game state so UI can reflect the phase change
        io.to(roomCode).emit('gameStateUpdate', { gameState: room.getState() });

        const state = room.getState();
        if (state.gamePhase === 'gameEnd') {
          const winner = room.getWinner();
          io.to(roomCode).emit('gameEnded', { 
            winner,
            finalScores: state.players.map(p => ({
              playerId: p.id,
              playerName: p.name,
              totalScore: p.totalScore
            }))
          });
          
          // Schedule room cleanup after game ends (give players time to view results)
          logger.cleanup(`Game ended in room ${roomCode}. Scheduling cleanup in 5 min...`);
          setTimeout(() => {
            const currentRoom = roomManager.getRoom(roomCode);
            if (currentRoom && currentRoom.getState().gamePhase === 'gameEnd') {
              logger.cleanup(`Auto-cleaning up finished game room: ${roomCode}`);
              cleanupRoom(roomCode, roomManager);
            }
          }, 300000); // Cleanup after 5 minutes
        }
      } catch (error) {
        callback({ success: false, error: 'Failed to call show' });
      }
    });

    // Start Next Round
    socket.on('startNextRound', (callback) => {
      try {
        const result = roomManager.getRoomByPlayerId(socket.id);
        if (!result) {
          callback({ success: false, error: 'Room not found' });
          return;
        }

        const { roomCode, room } = result;
        
        // Clear any existing timer before starting new round
        const existingTimer = turnTimers.get(roomCode);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }
        
        room.startNextRound();

        callback({ success: true });
        io.to(roomCode).emit('gameStateUpdate', { gameState: room.getState() });

        // Start turn timer for new round
        const state = room.getState();
        if (state.gamePhase === 'playing') {
          startTurnTimer(io, roomCode, room);
        }
      } catch (error) {
        callback({ success: false, error: 'Failed to start next round' });
      }
    });

    // Leave Room
    socket.on('leaveRoom', () => {
      handlePlayerDisconnect(socket.id, io, roomManager);
    });

    // Disconnect
    socket.on('disconnect', () => {
      logger.debug(`Client disconnected: ${socket.id}`);
      handlePlayerDisconnect(socket.id, io, roomManager);
    });
  });
}

function handlePlayerDisconnect(playerId: string, io: Server, roomManager: RoomManager) {
  const result = roomManager.getRoomByPlayerId(playerId);
  if (!result) return;

  const { roomCode, room } = result;
  const state = room.getState();

  // If game hasn't started, remove player
  if (state.gamePhase === 'lobby') {
    room.removePlayer(playerId);
    
    // If no players left, delete room and cleanup
    if (state.players.length === 0) {
      cleanupRoom(roomCode, roomManager);
    } else {
      io.to(roomCode).emit('playerLeft', { 
        playerId,
        players: room.getState().players 
      });
    }
  } else if (state.gamePhase === 'gameEnd') {
    // Game has ended - safe to remove player and potentially delete room
    room.removePlayer(playerId);
    
    // If no players left or all disconnected, delete room
    if (state.players.length === 0 || state.players.every(p => !p.isConnected)) {
      logger.cleanup(`Cleaning up finished game room: ${roomCode}`);
      cleanupRoom(roomCode, roomManager);
    }
  } else {
    // Mark player as disconnected but keep in game
    const player = state.players.find(p => p.id === playerId);
    if (player) {
      player.isConnected = false;
      io.to(roomCode).emit('playerDisconnected', { playerId });
      
      // If all players disconnected during active game, cleanup after delay
      if (state.players.every(p => !p.isConnected)) {
        logger.cleanup(`All players disconnected from room ${roomCode}. Scheduling cleanup...`);
        setTimeout(() => {
          const currentResult = roomManager.getRoomByPlayerId(playerId);
          if (currentResult && currentResult.room.getState().players.every(p => !p.isConnected)) {
            logger.cleanup(`Cleaning up abandoned room: ${roomCode}`);
            cleanupRoom(roomCode, roomManager);
          }
        }, 60000); // Cleanup after 1 minute of all players being disconnected
      }
    }
  }
}

// Centralized room cleanup function
function cleanupRoom(roomCode: string, roomManager: RoomManager) {
  // Clear any active timers
  const existingTimer = turnTimers.get(roomCode);
  if (existingTimer) {
    clearTimeout(existingTimer);
    turnTimers.delete(roomCode);
    logger.debug(`Cleared timer for room: ${roomCode}`);
  }
  
  // Delete the room
  roomManager.deleteRoom(roomCode);
}

// Turn timer management
const turnTimers: Map<string, NodeJS.Timeout> = new Map();

function startTurnTimer(io: Server, roomCode: string, room: any) {
  const state = room.getState();
  
  // Don't start timer if disabled or game not in playing phase
  if (!state.settings.timerEnabled || state.gamePhase !== 'playing') {
    return;
  }

  // Clear existing timer
  const existingTimer = turnTimers.get(roomCode);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set new timer
  const timer = setTimeout(() => {
    const currentState = room.getState();
    
    // Only execute if still in playing phase
    if (currentState.gamePhase !== 'playing') {
      return;
    }
    
    const timeoutResult = room.checkTurnTimeout();
    if (timeoutResult) {
      io.to(roomCode).emit('turnTimeout', timeoutResult);
      io.to(roomCode).emit('gameStateUpdate', { gameState: room.getState() });
      
      // Only start next timer if game is still in playing phase
      const afterState = room.getState();
      if (afterState.gamePhase === 'playing') {
        startTurnTimer(io, roomCode, room);
      }
    }
  }, state.settings.timerDuration * 1000);

  turnTimers.set(roomCode, timer);
}
