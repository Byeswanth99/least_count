import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const DISCONNECT_GRACE_MS = 3000;

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissServerError = useCallback(() => setServerError(null), []);

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketInstance.on('connect', () => {
      if (graceTimer.current) {
        clearTimeout(graceTimer.current);
        graceTimer.current = null;
      }
      setIsReconnecting(false);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsReconnecting(true);
      graceTimer.current = setTimeout(() => {
        if (!socketInstance.connected) {
          setIsReconnecting(false);
          setIsConnected(false);
        }
      }, DISCONNECT_GRACE_MS);
    });

    socketInstance.on('serverError', (data: { message: string }) => {
      setServerError(data.message);
    });

    setSocket(socketInstance);

    return () => {
      if (graceTimer.current) clearTimeout(graceTimer.current);
      socketInstance.close();
    };
  }, []);

  return { socket, isConnected, isReconnecting, serverError, dismissServerError };
}
