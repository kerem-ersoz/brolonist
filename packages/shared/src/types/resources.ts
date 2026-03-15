export enum ResourceType {
  Brick = 'brick',
  Lumber = 'lumber',
  Ore = 'ore',
  Grain = 'grain',
  Wool = 'wool',
}

export const ALL_RESOURCES = [
  ResourceType.Brick,
  ResourceType.Lumber,
  ResourceType.Ore,
  ResourceType.Grain,
  ResourceType.Wool,
] as const;

export type Resources = Record<ResourceType, number>;

export function emptyResources(): Resources {
  return { brick: 0, lumber: 0, ore: 0, grain: 0, wool: 0 };
}

export function addResources(a: Resources, b: Resources): Resources {
  return {
    brick: a.brick + b.brick,
    lumber: a.lumber + b.lumber,
    ore: a.ore + b.ore,
    grain: a.grain + b.grain,
    wool: a.wool + b.wool,
  };
}

export function subtractResources(a: Resources, b: Resources): Resources {
  return {
    brick: a.brick - b.brick,
    lumber: a.lumber - b.lumber,
    ore: a.ore - b.ore,
    grain: a.grain - b.grain,
    wool: a.wool - b.wool,
  };
}

export function hasResources(has: Resources, needs: Resources): boolean {
  return (
    has.brick >= needs.brick &&
    has.lumber >= needs.lumber &&
    has.ore >= needs.ore &&
    has.grain >= needs.grain &&
    has.wool >= needs.wool
  );
}

export function totalCards(r: Resources): number {
  return r.brick + r.lumber + r.ore + r.grain + r.wool;
}

export enum TerrainType {
  Hills = 'hills',
  Forest = 'forest',
  Mountains = 'mountains',
  Fields = 'fields',
  Pasture = 'pasture',
  Desert = 'desert',
}

export const TERRAIN_RESOURCE: Record<TerrainType, ResourceType | null> = {
  [TerrainType.Hills]: ResourceType.Brick,
  [TerrainType.Forest]: ResourceType.Lumber,
  [TerrainType.Mountains]: ResourceType.Ore,
  [TerrainType.Fields]: ResourceType.Grain,
  [TerrainType.Pasture]: ResourceType.Wool,
  [TerrainType.Desert]: null,
};

export enum BuildingType {
  Road = 'road',
  Settlement = 'settlement',
  City = 'city',
}

export const BUILDING_COSTS: Record<BuildingType, Resources> = {
  [BuildingType.Road]: { brick: 1, lumber: 1, ore: 0, grain: 0, wool: 0 },
  [BuildingType.Settlement]: { brick: 1, lumber: 1, ore: 0, grain: 1, wool: 1 },
  [BuildingType.City]: { brick: 0, lumber: 0, ore: 3, grain: 2, wool: 0 },
};

export const BUILDING_LIMITS: Record<BuildingType, number> = {
  [BuildingType.Road]: 15,
  [BuildingType.Settlement]: 5,
  [BuildingType.City]: 4,
};

export enum DevelopmentCardType {
  Knight = 'knight',
  VictoryPoint = 'victory_point',
  RoadBuilding = 'road_building',
  YearOfPlenty = 'year_of_plenty',
  Monopoly = 'monopoly',
}

export const DEV_CARD_COST: Resources = { brick: 0, lumber: 0, ore: 1, grain: 1, wool: 1 };

export const DEV_CARD_COUNTS: Record<DevelopmentCardType, number> = {
  [DevelopmentCardType.Knight]: 14,
  [DevelopmentCardType.VictoryPoint]: 5,
  [DevelopmentCardType.RoadBuilding]: 2,
  [DevelopmentCardType.YearOfPlenty]: 2,
  [DevelopmentCardType.Monopoly]: 2,
};

export enum HarborType {
  Generic = 'generic',
  Brick = 'brick',
  Lumber = 'lumber',
  Ore = 'ore',
  Grain = 'grain',
  Wool = 'wool',
}

export enum PlayerColor {
  Red = 'red',
  Blue = 'blue',
  White = 'white',
  Orange = 'orange',
  Green = 'green',
  Brown = 'brown',
  Purple = 'purple',
  Teal = 'teal',
  Pink = 'pink',
  Black = 'black',
}
