import { describe, it, expect } from 'vitest';
import { getTargetVP } from '../scoring.js';

describe('getTargetVP', () => {
  it('returns 10 for 4 players', () => {
    expect(getTargetVP(4)).toBe(10);
  });

  it('returns 10 for 3 players', () => {
    expect(getTargetVP(3)).toBe(10);
  });

  it('returns 12 for 5 players', () => {
    expect(getTargetVP(5)).toBe(12);
  });

  it('returns 12 for 6 players', () => {
    expect(getTargetVP(6)).toBe(12);
  });

  it('returns 14 for 7 players', () => {
    expect(getTargetVP(7)).toBe(14);
  });

  it('returns 14 for 8 players', () => {
    expect(getTargetVP(8)).toBe(14);
  });
});
