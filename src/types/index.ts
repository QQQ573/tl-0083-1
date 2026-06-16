export type StepType = 'cup' | 'ice' | 'base' | 'topping' | 'milk' | 'syrup' | 'cream' | 'coffee' | 'fruit' | 'jam' | 'cheese' | 'boba' | 'coconut' | 'redbean' | 'taro' | 'whip'

export interface Step {
  id: string
  name: string
  type: StepType
  emoji: string
}

export interface Drink {
  name: string
  modifier: string
  steps: Step[]
  distractors: Step[]
}

export interface RankingBrand {
  name: string
  avgSeconds: number
  color: string
}

export interface LevelConfig {
  id: string
  brand: string
  brandColor: string
  timeLimit: number
  orderCount: number
  drinks: Drink[]
  rankingBrands: RankingBrand[]
}

export interface GameStats {
  avgSeconds: number
  totalOrders: number
  stepErrors: Record<string, number>
  brandName: string
  brandColor: string
  playerAvgSeconds: number
  rankingBrands: RankingBrand[]
}

export const STEP_COLORS: Record<StepType, number> = {
  cup: 0x8D6E63,
  ice: 0x81D4FA,
  base: 0xA5D6A7,
  topping: 0xFFCC80,
  milk: 0xFFF9C4,
  syrup: 0xFFAB91,
  cream: 0xF5F5F5,
  coffee: 0x5D4037,
  fruit: 0xEF5350,
  jam: 0xE91E63,
  cheese: 0xFFF176,
  boba: 0x3E2723,
  coconut: 0xF0F4C3,
  redbean: 0xC62828,
  taro: 0x9C27B0,
  whip: 0xFFFFFF,
}
