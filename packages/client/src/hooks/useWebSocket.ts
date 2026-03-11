import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { useLobbyStore } from '../store/lobbyStore';
import { useAuthStore } from '../store/authStore';

export function useWebSocket(gameId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reconnectAttempts = useRef(0);

  const token = useAuthStore((s) => s.token);
  const setConnectionStatus = useGameStore((s) => s.setConnectionStatus);
  const setGameState = useGameStore((s) => s.setGameState);
  const setMyPlayerId = useGameStore((s) => s.setMyPlayerId);
  const applyDelta = useGameStore((s) => s.applyDelta);
  const setError = useGameStore((s) => s.setError);
  const addLogEntry = useGameStore((s) => s.addLogEntry);

  const connect = useCallback(() => {
    if (!token || !gameId) return;

    setConnectionStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnectionStatus('connected');
      reconnectAttempts.current = 0;
      // Auto-join game
      ws.send(JSON.stringify({ type: 'join_game', payload: { gameId }, seq: 0, timestamp: new Date().toISOString() }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'player_id':
            setMyPlayerId(msg.payload.playerId);
            break;
          case 'lobby_state':
            useLobbyStore.getState().setCurrentLobby(msg.payload);
            break;
          case 'game_state':
            // Clear lobby when the game actually starts
            useLobbyStore.getState().setCurrentLobby(null);
            setGameState(msg.payload);
            break;
          case 'state_update':
            applyDelta(msg.payload);
            break;
          case 'action_result':
            if (!msg.payload.success) {
              setError(msg.payload.error);
            }
            break;
          case 'error':
            setError(msg.payload.message);
            break;
          case 'game_ended':
            useGameStore.getState().setGameResult(msg.payload);
            break;
          default:
            // Log events like chat, dice_rolled, player_joined, etc.
            if (msg.payload) {
              addLogEntry({ type: msg.type, message: JSON.stringify(msg.payload), timestamp: new Date().toISOString() });
            }
            break;
        }
      } catch { /* ignore parse errors */ }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      // Exponential backoff reconnect
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current++;
      reconnectTimeout.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [token, gameId, setConnectionStatus, setGameState, setMyPlayerId, applyDelta, setError, addLogEntry]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type,
        payload,
        seq: Date.now(),
        timestamp: new Date().toISOString(),
      }));
    }
  }, []);

  return { sendMessage, connectionStatus: useGameStore((s) => s.connectionStatus) };
}
