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
            if (msg.payload.code === 'GAME_NOT_FOUND') {
              window.location.href = '/';
            }
            break;
          case 'game_ended':
            useGameStore.getState().setGameResult(msg.payload);
            break;
          case 'trade_proposed': {
            // Add the offer to activeTradeOffers in game state
            const gs = useGameStore.getState().gameState;
            if (gs) {
              const offers = [...(gs.activeTradeOffers || []), msg.payload.offer];
              useGameStore.getState().applyDelta({ activeTradeOffers: offers } as never);
            }
            const o = msg.payload.offer;
            const res = (r: Record<string, number>) => Object.entries(r).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${k}`).join(', ');
            addLogEntry({ type: 'trade_proposed', message: `offers ${res(o.offering)} for ${res(o.requesting)}`, playerId: o.fromPlayerId, timestamp: new Date().toISOString() });
            break;
          }
          case 'trade_completed': {
            // Remove completed offer from active offers
            const gs2 = useGameStore.getState().gameState;
            if (gs2) {
              const remaining = (gs2.activeTradeOffers || []).filter((o: unknown) => (o as { id: string }).id !== msg.payload.offerId);
              useGameStore.getState().applyDelta({ activeTradeOffers: remaining } as never);
            }
            addLogEntry({ type: 'trade_completed', message: `Trade completed!`, timestamp: new Date().toISOString() });
            break;
          }
          default: {
            // Format known event types as human-readable log entries
            const p = msg.payload || {};
            let logMsg = '';
            switch (msg.type) {
              case 'dice_rolled': logMsg = `rolled ${p.values?.[0]}+${p.values?.[1]} = ${(p.values?.[0] || 0) + (p.values?.[1] || 0)}`; break;
              case 'player_joined': logMsg = 'joined the game'; break;
              case 'player_left': logMsg = 'left the game'; break;
              case 'player_ready': logMsg = p.ready ? 'is ready' : 'is not ready'; break;
              case 'chat': logMsg = p.message; break;
              default: logMsg = msg.type.replace(/_/g, ' ');
            }
            if (logMsg) {
              addLogEntry({ type: msg.type, message: logMsg, playerId: p.playerId, timestamp: new Date().toISOString() });
            }
            break;
          }
        }
      } catch { /* ignore parse errors */ }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      // Only reconnect if we still have the same gameId (not navigated away)
      if (wsRef.current === ws) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        reconnectTimeout.current = setTimeout(connect, delay);
      }
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
      // Send leave_game before disconnecting
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'leave_game', payload: {}, seq: 0, timestamp: new Date().toISOString() }));
      }
      wsRef.current?.close();
      wsRef.current = null;
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
