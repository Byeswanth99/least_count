import { GameRoom } from './GameRoom';
import { GameSettings } from '../types/game';
import { logger } from '../utils/logger';

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private roomCreationTimes: Map<string, number> = new Map();

  generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostId: string, hostName: string, settings: GameSettings): string {
    const roomCode = this.generateRoomCode();
    const room = new GameRoom(roomCode, hostId, hostName, settings);
    this.rooms.set(roomCode, room);
    this.roomCreationTimes.set(roomCode, Date.now());
    logger.gameEvent('Room created', roomCode, `Total rooms: ${this.rooms.size}`);
    return roomCode;
  }

  getRoom(roomCode: string): GameRoom | undefined {
    return this.rooms.get(roomCode);
  }

  deleteRoom(roomCode: string): void {
    this.rooms.delete(roomCode);
    this.roomCreationTimes.delete(roomCode);
    logger.gameEvent('Room deleted', roomCode, `Remaining rooms: ${this.rooms.size}`);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  // Cleanup stale rooms (older than maxAgeMs and in finished/abandoned state)
  cleanupStaleRooms(maxAgeMs: number = 3600000): number { // Default 1 hour
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [roomCode, room] of this.rooms.entries()) {
      const creationTime = this.roomCreationTimes.get(roomCode) || now;
      const age = now - creationTime;
      const state = room.getState();
      
      // Aggressive cleanup strategy:
      // 1. Finished games (gameEnd): 3 min after completion
      // 2. Abandoned lobbies: 15 min if no game started
      // 3. All players disconnected: 2 min (instant cleanup)
      // 4. Active games abandoned > 1 hour: assume dead
      const shouldCleanup = 
        (state.gamePhase === 'gameEnd' && age > 180000) || // 3 min - finished games
        (state.gamePhase === 'lobby' && age > 900000) || // 15 min - abandoned lobbies
        (state.players.every(p => !p.isConnected) && age > 120000) || // 2 min - all disconnected
        (age > 3600000); // 1 hour - anything still alive
      
      if (shouldCleanup) {
        logger.cleanup(`Stale room ${roomCode}`, {
          age: `${Math.round(age / 60000)} min`,
          phase: state.gamePhase,
          connected: `${state.players.filter(p => p.isConnected).length}/${state.players.length}`
        });
        this.deleteRoom(roomCode);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.cleanup(`Removed ${cleanedCount} stale room(s)`, `Remaining: ${this.rooms.size}`);
    }
    
    return cleanedCount;
  }

  getRoomByPlayerId(playerId: string): { roomCode: string; room: GameRoom } | null {
    for (const [roomCode, room] of this.rooms.entries()) {
      const state = room.getState();
      if (state.players.find(p => p.id === playerId)) {
        return { roomCode, room };
      }
    }
    return null;
  }
}
