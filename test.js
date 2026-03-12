const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'packages/client/public/assets/sprites');
const PLAYER_COLORS = {
  red: '#e53935', blue: '#1e88e5', white: '#eeeeee', orange: '#fb8c00',
  green: '#43a047', brown: '#6d4c41', purple: '#8e24aa', teal: '#00897b'
};
const createSvg = (filename, content) => {
  fs.writeFileSync(path.join(dir, filename + '.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n' + content + '\n</svg>');
};
for (const [name, color] of Object.entries(PLAYER_COLORS)) {
  createSvg('settlement-' + name, '<path d="M50 15 L10 50 V90 H90 V50 Z" fill="' + color + '"/><path d="M50 15 L10 50 M50 15 L90 50" stroke="#fff" stroke-width="4"/>');
  createSvg('city-' + name, '<path d="M35 15 L5 40 V90 H95 V60 H65 V15 Z" fill="' + color + '"/><path d="M35 15 L5 40 M65 15 L35 15 M95 60 L65 60" stroke="#fff" stroke-width="4"/>');
  createSvg('road-' + name, '<path d="M10 40 H90 V60 H10 Z" fill="' + color + '" stroke="#fff" stroke-widt  createSvg('road-' + namg('done');
