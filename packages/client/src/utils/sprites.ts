const base = import.meta.env.BASE_URL || '/';
const s = (path: string) => `${base}${path}`.replace('//', '/');

export const RESOURCE_SPRITES: Record<string, string> = {
  brick: s('assets/sprites/pip-brick.svg'),
  lumber: s('assets/sprites/pip-wood.svg'),
  ore: s('assets/sprites/pip-ore.svg'),
  grain: s('assets/sprites/pip-grain.svg'),
  wool: s('assets/sprites/pip-sheep.svg'),
};

export const DEV_CARD_SPRITES: Record<string, string> = {
  knight: s('assets/sprites/dev-knight.png'),
  victory_point: s('assets/sprites/dev-vp.png'),
  road_building: s('assets/sprites/dev-roads.png'),
  year_of_plenty: s('assets/sprites/dev-yop.png'),
  monopoly: s('assets/sprites/dev-mono.png'),
};

export const ICONS = {
  settlement: s('assets/sprites/settlement.svg'),
  city: s('assets/sprites/city.svg'),
  road: s('assets/sprites/road.svg'),
  cardResource: s('assets/sprites/resource-card-back.png'),
  cardDev: s('assets/sprites/dev-card-back.png'),
};

export { s as assetPath };
