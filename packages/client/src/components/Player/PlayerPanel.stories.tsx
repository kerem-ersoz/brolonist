import type { Meta, StoryObj } from '@storybook/react';
import { PlayerPanel } from './PlayerPanel';

const meta: Meta<typeof PlayerPanel> = {
  title: 'Player/PlayerPanel',
  component: PlayerPanel,
  args: {
    resources: { brick: 1, lumber: 2, ore: 0, grain: 3, wool: 1 },
    developmentCards: [],
    roadsBuilt: 2,
    settlementsBuilt: 1,
    citiesBuilt: 0,
    victoryPoints: 3,
  },
};
export default meta;

type Story = StoryObj<typeof PlayerPanel>;

export const FullHand: Story = {
  args: {
    resources: { brick: 3, lumber: 2, ore: 4, grain: 1, wool: 2 },
    developmentCards: [
      { type: 'knight' },
      { type: 'victoryPoint' },
      { type: 'roadBuilding' },
    ],
    roadsBuilt: 5,
    settlementsBuilt: 3,
    citiesBuilt: 1,
    victoryPoints: 7,
  },
};

export const EmptyHand: Story = {
  args: {
    resources: { brick: 0, lumber: 0, ore: 0, grain: 0, wool: 0 },
    developmentCards: [],
    roadsBuilt: 0,
    settlementsBuilt: 0,
    citiesBuilt: 0,
    victoryPoints: 2,
  },
};

export const ManyResources: Story = {
  args: {
    resources: { brick: 8, lumber: 6, ore: 10, grain: 5, wool: 7 },
    developmentCards: [
      { type: 'knight' },
      { type: 'knight' },
      { type: 'monopoly' },
      { type: 'yearOfPlenty' },
    ],
    roadsBuilt: 10,
    settlementsBuilt: 4,
    citiesBuilt: 3,
    victoryPoints: 9,
  },
};
