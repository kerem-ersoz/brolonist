import type { Meta, StoryObj } from '@storybook/react';
import { GameLog } from './GameLog';

const meta: Meta<typeof GameLog> = {
  title: 'Chat/GameLog',
  component: GameLog,
  args: {
    entries: [],
    playerNames: {
      p1: { name: 'Alice', color: 'red' },
      p2: { name: 'Bob', color: 'blue' },
      p3: { name: 'Carol', color: 'orange' },
    },
  },
};
export default meta;

type Story = StoryObj<typeof GameLog>;

export const EmptyLog: Story = {};

export const ManyEntries: Story = {
  args: {
    entries: [
      { timestamp: '12:00:01', playerId: 'p1', type: 'roll', message: 'rolled a 7' },
      { timestamp: '12:00:05', type: 'system', message: 'Robber must be moved' },
      { timestamp: '12:00:10', playerId: 'p1', type: 'robber', message: 'moved the robber' },
      { timestamp: '12:00:15', playerId: 'p1', type: 'steal', message: 'stole a resource from Bob' },
      { timestamp: '12:00:20', playerId: 'p1', type: 'build', message: 'built a settlement' },
      { timestamp: '12:00:30', playerId: 'p2', type: 'roll', message: 'rolled an 8' },
      { timestamp: '12:00:35', playerId: 'p2', type: 'trade', message: 'traded with Carol' },
      { timestamp: '12:00:40', playerId: 'p3', type: 'build', message: 'built a road' },
      { timestamp: '12:00:45', playerId: 'p3', type: 'build', message: 'built a city' },
      { timestamp: '12:00:50', type: 'system', message: 'Carol earned Longest Road' },
      { timestamp: '12:01:00', playerId: 'p1', type: 'devcard', message: 'played a Knight' },
      { timestamp: '12:01:05', type: 'system', message: 'Alice earned Largest Army' },
    ],
  },
};
