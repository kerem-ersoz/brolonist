import type { Meta, StoryObj } from '@storybook/react';
import { OpponentBar } from './OpponentBar';

const meta: Meta<typeof OpponentBar> = {
  title: 'Player/OpponentBar',
  component: OpponentBar,
  args: { currentPlayerId: 'p2' },
};
export default meta;

type Story = StoryObj<typeof OpponentBar>;

export const ThreeOpponents: Story = {
  args: {
    opponents: [
      { id: 'p1', name: 'Alice', color: 'red', victoryPoints: 4, resourceCount: 5, devCardCount: 2, hasLongestRoad: false, hasLargestArmy: false, status: 'active' },
      { id: 'p2', name: 'Bob', color: 'blue', victoryPoints: 6, resourceCount: 3, devCardCount: 1, hasLongestRoad: true, hasLargestArmy: false, status: 'active' },
      { id: 'p3', name: 'Carol', color: 'white', victoryPoints: 3, resourceCount: 7, devCardCount: 0, hasLongestRoad: false, hasLargestArmy: false, status: 'active' },
    ],
  },
};

export const SevenOpponents: Story = {
  args: {
    opponents: [
      { id: 'p1', name: 'Alice', color: 'red', victoryPoints: 4, resourceCount: 5, devCardCount: 2, hasLongestRoad: false, hasLargestArmy: false, status: 'active' },
      { id: 'p2', name: 'Bob', color: 'blue', victoryPoints: 6, resourceCount: 3, devCardCount: 1, hasLongestRoad: true, hasLargestArmy: false, status: 'active' },
      { id: 'p3', name: 'Carol', color: 'white', victoryPoints: 3, resourceCount: 7, devCardCount: 0, hasLongestRoad: false, hasLargestArmy: false, status: 'active' },
      { id: 'p4', name: 'Dave', color: 'orange', victoryPoints: 5, resourceCount: 4, devCardCount: 3, hasLongestRoad: false, hasLargestArmy: true, status: 'active' },
      { id: 'p5', name: 'Eve', color: 'green', victoryPoints: 2, resourceCount: 8, devCardCount: 0, hasLongestRoad: false, hasLargestArmy: false, status: 'active' },
      { id: 'p6', name: 'Frank', color: 'brown', victoryPoints: 3, resourceCount: 2, devCardCount: 1, hasLongestRoad: false, hasLargestArmy: false, status: 'active' },
      { id: 'p7', name: 'Grace', color: 'purple', victoryPoints: 7, resourceCount: 1, devCardCount: 4, hasLongestRoad: false, hasLargestArmy: false, status: 'active' },
    ],
  },
};

export const WithBadges: Story = {
  args: {
    opponents: [
      { id: 'p1', name: 'Alice', color: 'red', victoryPoints: 7, resourceCount: 3, devCardCount: 1, hasLongestRoad: true, hasLargestArmy: false, status: 'active' },
      { id: 'p2', name: 'Bob', color: 'blue', victoryPoints: 8, resourceCount: 5, devCardCount: 4, hasLongestRoad: false, hasLargestArmy: true, status: 'active' },
      { id: 'p3', name: 'Carol', color: 'orange', victoryPoints: 2, resourceCount: 0, devCardCount: 0, hasLongestRoad: false, hasLargestArmy: false, status: 'quit' },
    ],
  },
};
