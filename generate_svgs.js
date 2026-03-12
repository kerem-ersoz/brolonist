const fs = require('fs');

const createSvg = (filename, content) => {
  fs.writeFileSync(`packages/client/public/assets/sprites/${filename}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n${content}\n</svg>`);
};

createSvg('settlement', '<path d="M50 10 L10 40 V90 H90 V40 Z" fill="#D2B48C" stroke="#000" stroke-width="4"/><path d="M10 40 L50 10 L90 40" stroke="#8B4513" stroke-width="6" fill="none"/>');

createSvg('city', '<path d="M30 10 L10 30 V90 H90 V70 Z M90 70 L90 30 L60 10 V70" fill="#A9A9A9" stroke="#000" stroke-width="4"/>');

// and so on...
