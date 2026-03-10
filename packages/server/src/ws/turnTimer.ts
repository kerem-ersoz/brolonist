const activeTimers = new Map<string, NodeJS.Timeout>();

export function startTurnTimer(gameId: string, durationMs: number, onTimeout: () => void): void {
  clearTurnTimer(gameId);
  const timer = setTimeout(() => {
    activeTimers.delete(gameId);
    onTimeout();
  }, durationMs);
  activeTimers.set(gameId, timer);
}

export function clearTurnTimer(gameId: string): void {
  const timer = activeTimers.get(gameId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(gameId);
  }
}

export function cleanupTimers(gameId: string): void {
  clearTurnTimer(gameId);
}
