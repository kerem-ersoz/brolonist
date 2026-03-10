import type { Meta, StoryObj } from '@storybook/react';
import { Board } from './Board';
import { createMockBoard, createMockBoardWithBuildings } from './__mocks__/mockBoard';

const meta: Meta<typeof Board> = {
  title: 'Board/Board',
  component: Board,
  args: {
    robberPosition: { q: 0, r: 0 },
    players: [
      { id: 'p1', color: 'red' },
      { id: 'p2', color: 'blue' },
      { id: 'p3', color: 'white' },
      { id: 'p4', color: 'orange' },
    ],
    size: 50,
  },
  decorators: [(Story) => <div style={{ width: 600, height: 500 }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof Board>;

export const Empty4Player: Story = {
  args: { board: createMockBoard(4) },
};

export const Empty6Player: Story = {
  args: {
    board: createMockBoard(6),
    players: [
      { id: 'p1', color: 'red' },
      { id: 'p2', color: 'blue' },
      { id: 'p3', color: 'white' },
      { id: 'p4', color: 'orange' },
      { id: 'p5', color: 'green' },
      { id: 'p6', color: 'brown' },
    ],
  },
};

export const WithBuildings: Story = {
  args: {
    board: createMockBoardWithBuildings(),
    players: [
      { id: 'p1', color: 'red' },
      { id: 'p2', color: 'blue' },
      { id: 'p3', color: 'white' },
      { id: 'p4', color: 'orange' },
      { id: 'p5', color: 'green' },
      { id: 'p6', color: 'brown' },
      { id: 'p7', color: 'purple' },
      { id: 'p8', color: 'teal' },
    ],
  },
};
