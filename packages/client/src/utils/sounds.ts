// Sound effect stubs — will be connected to actual audio files later
const audioContext = typeof AudioContext !== 'undefined' ? new AudioContext() : null;

function playBeep(frequency: number, duration: number): void {
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.frequency.value = frequency;
  gainNode.gain.value = 0.1;
  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.stop(audioContext.currentTime + duration);
}

export const sounds = {
  diceRoll: () => playBeep(440, 0.15),
  build: () => playBeep(523, 0.1),
  trade: () => playBeep(659, 0.1),
  yourTurn: () => { playBeep(523, 0.1); setTimeout(() => playBeep(659, 0.1), 150); },
  victory: () => { playBeep(523, 0.15); setTimeout(() => playBeep(659, 0.15), 200); setTimeout(() => playBeep(784, 0.3), 400); },
  error: () => playBeep(220, 0.2),
};
