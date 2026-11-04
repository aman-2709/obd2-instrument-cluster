import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';

const RECONNECT_DELAY_MS = 3000;
const CLOSED = 3;

// Minimal stand-in for the browser WebSocket. Tests drive it explicitly
// (open / receive / drop) so each scenario is deterministic.
class MockWebSocket {
  static readonly OPEN = 1;
  static instances: MockWebSocket[] = [];

  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  send(payload: string): void {
    this.sent.push(payload);
  }

  // Client-initiated close (what the hook's cleanup calls).
  close(): void {
    this.drop();
  }

  open(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  receive(payload: object): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(payload) }));
  }

  // Server-initiated drop (backend restart, network loss).
  drop(): void {
    this.readyState = CLOSED;
    this.onclose?.();
  }
}

const liveSockets = (): MockWebSocket[] =>
  MockWebSocket.instances.filter((socket) => socket.readyState !== CLOSED);

const latestSocket = (): MockWebSocket =>
  MockWebSocket.instances[MockWebSocket.instances.length - 1];

const advanceReconnectTimer = (): void => {
  act(() => {
    jest.advanceTimersByTime(RECONNECT_DELAY_MS);
  });
};

describe('useWebSocket', () => {
  const originalWebSocket = window.WebSocket;

  beforeAll(() => {
    window.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterAll(() => {
    window.WebSocket = originalWebSocket;
  });

  beforeEach(() => {
    MockWebSocket.instances = [];
    jest.useFakeTimers();
    // The hook logs connection lifecycle; keep test output pristine.
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    // Unmount while the console spies are still installed: unmounting closes
    // the socket, which logs 'WebSocket closed'.
    cleanup();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('connection', () => {
    test('connects to the local backend and exposes parsed telemetry', () => {
      const { result } = renderHook(() => useWebSocket());

      expect(MockWebSocket.instances).toHaveLength(1);
      expect(latestSocket().url).toBe('ws://localhost:8000/ws');
      expect(result.current.data).toEqual({});
      expect(result.current.speedUnit).toBe('km/h');

      act(() => {
        latestSocket().open();
        latestSocket().receive({ RPM: '3200', Speed: '85', SpeedUnit: 'mph' });
      });

      expect(result.current.data).toEqual({ RPM: '3200', Speed: '85', SpeedUnit: 'mph' });
      expect(result.current.speedUnit).toBe('mph');
    });

    test('ignores a malformed message and keeps the previous data', () => {
      const { result } = renderHook(() => useWebSocket());

      act(() => {
        latestSocket().receive({ RPM: '1000' });
        latestSocket().onmessage?.(new MessageEvent('message', { data: 'not json' }));
      });

      expect(result.current.data).toEqual({ RPM: '1000' });
    });

    test('closes the socket on unmount', () => {
      const { unmount } = renderHook(() => useWebSocket());
      const socket = latestSocket();

      unmount();

      expect(socket.readyState).toBe(CLOSED);
    });
  });

  describe('reconnecting after the connection drops', () => {
    test('waits for the reconnect delay before opening a new socket', () => {
      renderHook(() => useWebSocket());

      act(() => latestSocket().drop());
      expect(MockWebSocket.instances).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(RECONNECT_DELAY_MS - 1);
      });
      expect(MockWebSocket.instances).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(MockWebSocket.instances).toHaveLength(2);
      expect(latestSocket().url).toBe('ws://localhost:8000/ws');
    });

    test('keeps delivering telemetry from the reconnected socket', () => {
      const { result } = renderHook(() => useWebSocket());
      act(() => latestSocket().receive({ RPM: '1000' }));

      act(() => latestSocket().drop());
      advanceReconnectTimer();
      act(() => {
        latestSocket().open();
        latestSocket().receive({ RPM: '4200', SpeedUnit: 'mph' });
      });

      expect(result.current.data).toEqual({ RPM: '4200', SpeedUnit: 'mph' });
      expect(result.current.speedUnit).toBe('mph');
    });

    test('keeps retrying when the reconnect attempt also drops', () => {
      const { result } = renderHook(() => useWebSocket());

      act(() => latestSocket().drop());
      advanceReconnectTimer();
      expect(MockWebSocket.instances).toHaveLength(2);

      act(() => latestSocket().drop());
      advanceReconnectTimer();
      expect(MockWebSocket.instances).toHaveLength(3);

      act(() => latestSocket().receive({ Speed: '42' }));
      expect(result.current.data).toEqual({ Speed: '42' });
    });

    test('sends the speed-unit toggle over the reconnected socket', () => {
      const { result } = renderHook(() => useWebSocket());
      const firstSocket = latestSocket();

      act(() => firstSocket.drop());
      advanceReconnectTimer();
      const reconnected = latestSocket();
      act(() => reconnected.open());

      act(() => result.current.toggleSpeedUnit());

      expect(reconnected.sent).toEqual(['toggle_speed_unit']);
      expect(firstSocket.sent).toEqual([]);
    });
  });

  describe('toggleSpeedUnit', () => {
    test('sends toggle_speed_unit when the socket is open', () => {
      const { result } = renderHook(() => useWebSocket());
      act(() => latestSocket().open());

      act(() => result.current.toggleSpeedUnit());

      expect(latestSocket().sent).toEqual(['toggle_speed_unit']);
    });

    test('does not send, and warns, when the socket is not open', () => {
      const { result } = renderHook(() => useWebSocket());

      act(() => result.current.toggleSpeedUnit());

      expect(latestSocket().sent).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith('WebSocket not open, cannot toggle speed unit');
    });
  });

  describe('unmounting', () => {
    test('does not reconnect after an intentional unmount', () => {
      const { unmount } = renderHook(() => useWebSocket());

      unmount();
      advanceReconnectTimer();

      expect(MockWebSocket.instances).toHaveLength(1);
      expect(liveSockets()).toHaveLength(0);
    });

    test('cancels a pending reconnect when unmounted during the delay', () => {
      const { unmount } = renderHook(() => useWebSocket());

      act(() => latestSocket().drop());
      unmount();
      advanceReconnectTimer();

      expect(MockWebSocket.instances).toHaveLength(1);
    });

    test('leaves exactly one live, working socket under React StrictMode double-mount', () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper: React.StrictMode });

      advanceReconnectTimer();

      expect(liveSockets()).toHaveLength(1);
      act(() => liveSockets()[0].receive({ RPM: '2500' }));
      expect(result.current.data).toEqual({ RPM: '2500' });
    });
  });
});
