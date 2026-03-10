import type { Meta, StoryObj } from '@storybook/react';
import { DiceDisplay } from './DiceDisplay';

const meta: Meta<typeof DiceDisplay> = {
  title: 'Actions/DiceDisplay',
  component: DiceDisplay,
  args: { dice: [3, 4], rolling: false },
};
export default meta;

type Story = StoryObj<typeof DiceDisplay>;

export const Default: Story = {
  args: { dice: [3, 4] },
};

export const SnakeEyes: Story = {
  args: { dice: [1, 1] },
};

export const Seven: Story = {
  args: { dice: [4, 3] },
};

export const BoxCars: Story = {
  args: { dice: [6, 6] },
};

export const Rolling: Story = {
  args: { dice: [2, 5], rolling: true },
};

export const NoDice: Story = {
  args: { dice: null },
};
