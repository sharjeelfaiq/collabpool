import { useCallback, useEffect, useMemo } from 'react';
import { io, type Socket } from 'socket.io-client';

type AckEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
};

type SocketPayload = Record<string, unknown>;
type SocketCallback<T> = (payload: T) => void;

let socket: Socket | null = null;

function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
  }

  return socket;
}

export function useSocket() {
  const client = useMemo(() => getSocket(), []);

  const emit = useCallback(
    <TData,>(event: string, payload: SocketPayload) =>
      new Promise<TData>((resolve, reject) => {
        client.emit(event, payload, (ack: AckEnvelope<TData>) => {
          if (ack && ack.success) {
            resolve(ack.data as TData);
            return;
          }

          reject(new Error(ack?.error?.message || 'Socket request failed.'));
        });
      }),
    [client],
  );

  const on = useCallback(
    <TPayload,>(event: string, callback: SocketCallback<TPayload>) => {
      client.on(event, callback);

      return () => {
        client.off(event, callback);
      };
    },
    [client],
  );

  useEffect(() => {
    if (!client.connected) {
      client.connect();
    }
  }, [client]);

  return { emit, on, socket: client };
}
