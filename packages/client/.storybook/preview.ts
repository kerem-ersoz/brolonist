import type { Preview } from '@storybook/react';
import '../src/i18n';
import '../src/styles/index.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#111827' },
        { name: 'light', value: '#ffffff' },
      ],
    },
  },
};

export default preview;
