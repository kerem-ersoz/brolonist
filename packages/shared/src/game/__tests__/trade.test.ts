import { describe, it, expect } from 'vitest';
import { getTradeRatio } from '../trade.js';
import { createPlayer } from '../../types/game.js';
import { ResourceType, PlayerColor, HarborType } from '../../types/resources.js';

describe('getTradeRatio', () => {
  it('returns 4 by default (no harbors)', () => {
    const player = createPlayer('p1', 'Alice', PlayerColor.Red);
    expect(getTradeRatio(player, ResourceType.Brick)).toBe(4);
  });

  it('returns 3 with a generic harbor', () => {
    const player = createPlayer('p1', 'Alice', PlayerColor.Red);
    player.harbors = [HarborType.Generic];
    expect(getTradeRatio(player, ResourceType.Ore)).toBe(3);
  });

  it('returns 2 with a specific harbor matching the resource', () => {
    const player = createPlayer('p1', 'Alice', PlayerColor.Red);
    player.harbors = [HarborType.Ore];
    expect(getTradeRatio(player, ResourceType.Ore)).toBe(2);
  });

  it('returns 4 when specific harbor does not match resource', () => {
    const player = createPlayer('p1', 'Alice', PlayerColor.Red);
    player.harbors = [HarborType.Ore];
    expect(getTradeRatio(player, ResourceType.Brick)).toBe(4);
  });

  it('prefers 2:1 specific over 3:1 generic', () => {
    const player = createPlayer('p1', 'Alice', PlayerColor.Red);
    player.harbors = [HarborType.Generic, HarborType.Lumber];
    expect(getTradeRatio(player, ResourceType.Lumber)).toBe(2);
  });
});
