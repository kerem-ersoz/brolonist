import type { Meta, StoryObj } from '@storybook/react';
import { TradePanel } from './TradePanel';

const noop = () => {};

const meta: Meta<typeof TradePanel> = {
  title: 'Trade/TradePanel',
  component: TradePanel,
  args: {
    myResources: { brick: 3, lumber: 2, ore: 1, grain: 4, wool: 2 },
    activeOffers: [],
    harbors: [],
    onPropose: noop,
    onAccept: noop,
    onDecline: noop,
    onBankTrade: noop,
    onClose: noop,
  },
};
export default meta;

type Story = StoryObj<typeof TradePanel>;

export const Empty: Story = {};

export const WithActiveOffers: Story = {
  args: {
    activeOffers: [
      {
        id: 'offer-1',
        fromPlayerName: 'Alice',
        offering: { brick: 2, lumber: 0, ore: 0, grain: 0, wool: 0 },
        requesting: { brick: 0, lumber: 0, ore: 1, grain: 0, wool: 0 },
      },
      {
        id: 'offer-2',
        fromPlayerName: 'Bob',
        offering: { brick: 0, lumber: 0, ore: 0, grain: 3, wool: 0 },
        requesting: { brick: 0, lumber: 1, ore: 0, grain: 0, wool: 1 },
      },
    ],
    harbors: ['grain', 'generic'],
  },
};
