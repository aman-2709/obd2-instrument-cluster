import { useEffect, useRef, useState } from 'react';
import { ObdData, SpeedUnit, WebSocketHookReturn } from '../types';

export const useWebSocket = (): WebSocketHookReturn => {
  const [data, setData] = useState<ObdData>({});
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>('km/h');
  const ws = useRef<WebSocket | null>(null);

  const getWebSocketUrl = (): string => {
    if (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    ) {
      return 'ws://localhost:8000/ws';
    } else {
      return 'ws://obd_backend:8000/ws';
    }
  };

  const toggleSpeedUnit = (): void => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send('toggle_speed_unit');
      console.log('Sent toggle_speed_unit to backend');
    } else {
      console.warn('WebSocket not open, cannot toggle speed unit');
    }
  };

  useEffect(() => {
    const wsUrl = getWebSocketUrl();
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    // Every socket, including reconnects, gets the full set of handlers.
    const connect = (): void => {
      console.log('Connecting to WebSocket:', wsUrl);
      const socket = new WebSocket(wsUrl);
      ws.current = socket;

      socket.onopen = () => {
        console.log('WebSocket opened!');
      };

      socket.onmessage = (event: MessageEvent) => {
        try {
          const newData: ObdData = JSON.parse(event.data);
          setData(newData);
          if (newData.SpeedUnit) {
            setSpeedUnit(newData.SpeedUnit as SpeedUnit);
          }
        } catch (e) {
          console.error('Failed to parse message:', event.data);
        }
      };

      socket.onerror = (error: Event) => {
        console.error('WebSocket connection error:', error);
      };

      socket.onclose = () => {
        console.log('WebSocket closed');
        if (disposed) return;
        reconnectTimer = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };
    };

    connect();

    return () => {
      // Stop the close we trigger here from scheduling a reconnect.
      disposed = true;
      clearTimeout(reconnectTimer);
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return { data, speedUnit, toggleSpeedUnit };
};