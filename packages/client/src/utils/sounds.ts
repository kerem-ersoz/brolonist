const base = import.meta.env.BASE_URL || '/';
const sndPath = (name: string) => `${base}assets/sounds/${name}`.replace('//', '/');

const audioCache = new Map<string, HTMLAudioElement>();

function playSound(name: string, opts?: { volume?: number; startTime?: number }): void {
  try {
    const src = sndPath(name);
    let audio = audioCache.get(name);
    if (!audio) {
      audio = new Audio(src);
      audioCache.set(name, audio);
    }
    audio.volume = opts?.volume ?? 0.5;
    audio.currentTime = opts?.startTime ?? 0;
    audio.play().catch(() => {});
  } catch { /* ignore audio errors */ }
}

export const sounds = {
  build: () => playSound('button-click.wav'),
  chat: () => playSound('chat-sound-4.wav', { volume: 0.4 }),
  gameEnd: () => playSound('clap.wav', { volume: 0.6 }),
  clockTick: () => playSound('clock-ticking.wav', { startTime: 4, volume: 0.5 }),
  stopClockTick: () => {
    const audio = audioCache.get('clock-ticking.wav');
    if (audio) { audio.pause(); audio.currentTime = 0; }
  },
  error: () => playSound('error.wav', { volume: 0.4 }),
  monopoly: () => playSound('monopoly.wav', { volume: 0.5 }),
  trade: () => playSound('bell-ring.wav', { volume: 0.5 }),
  turnWarning: () => playSound('turn-warning.mp3', { volume: 0.5 }),
  diceRoll: () => playSound('dice.mp3', { volume: 0.5 }),
  robber: () => playSound('robber.wav', { volume: 0.5 }),
  longest: () => playSound('longest.wav', { volume: 0.5 }),
  discard: () => playSound('discard.wav', { volume: 0.5 }),
  cardFlick: () => {
    // Create a new Audio each time so overlapping flicks work
    try {
      const audio = new Audio(sndPath('card-flick.mp3'));
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch { /* ignore */ }
  },
};
