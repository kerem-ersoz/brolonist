import type { Meta, StoryObj } from '@storybook/react';
import { ActionBar } from './ActionBar';

const noop = () => {};

const meta: Meta<typeof ActionBar> = {
  title: 'Actions/ActionBar',
  component: ActionBar,
  args: {
    phase: 'main',
    isMyTurn: true,
    canRoll: false,
    canBuild: false,
    canTrade: false,
    canBuyDevCard: false,
    canEndTurn: false,
    onRollDice: noop,
    onBuild: noop,
    onBuyDevCard: noop,
    onTrade: noop,
    onEndTurn: noop,
  },
};
export default meta;

type Story = StoryObj<typeof ActionBar>;

export const MustRoll: Story = {
  args: {
    canRoll: true,
  },
};

export const CanBuildAndTrade: Story = {
  args: {
    canBuild: true,
    canTrade: true,
    canBuyDevCard: true,
    canEndTurn: true,
  },
};

export const WaitingForOthers: Story = {
  args: {
    isMyTurn: false,
  },
};
