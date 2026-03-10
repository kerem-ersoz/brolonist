import type { Meta, StoryObj } from '@storybook/react';
import { HexTile } from './HexTile';

const SVG_WRAPPER_SIZE = 200;

const meta: Meta<typeof HexTile> = {
  title: 'Board/HexTile',
  component: HexTile,
  decorators: [
    (Story) => (
      <svg width={SVG_WRAPPER_SIZE} height={SVG_WRAPPER_SIZE} viewBox="-60 -60 120 120">
        <Story />
      </svg>
    ),
  ],
  args: { q: 0, r: 0, size: 40, numberToken: null },
};
export default meta;

type Story = StoryObj<typeof HexTile>;

export const Hills: Story = { args: { terrain: 'hills', numberToken: 5 } };
export const Forest: Story = { args: { terrain: 'forest', numberToken: 9 } };
export const Mountains: Story = { args: { terrain: 'mountains', numberToken: 3 } };
export const Fields: Story = { args: { terrain: 'fields', numberToken: 6 } };
export const Pasture: Story = { args: { terrain: 'pasture', numberToken: 11 } };
export const Desert: Story = { args: { terrain: 'desert', numberToken: null } };
export const Water: Story = { args: { terrain: 'water', numberToken: null } };

export const WithRobber: Story = {
  args: { terrain: 'desert', numberToken: null, hasRobber: true },
};

export const RedNumber6: Story = {
  args: { terrain: 'hills', numberToken: 6 },
};

export const RedNumber8: Story = {
  args: { terrain: 'fields', numberToken: 8 },
};

export const Highlighted: Story = {
  args: { terrain: 'pasture', numberToken: 4, highlighted: true },
};
