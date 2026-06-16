import Phaser from 'phaser'
import starbucksData from '../data/level-starbucks.json'
import heyteaData from '../data/level-heytea.json'
import mixueData from '../data/level-mixue.json'
import type { LevelConfig } from '../types'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload(): void {
  }

  create(): void {
    const levels: Record<string, LevelConfig> = {
      starbucks: starbucksData as unknown as LevelConfig,
      heytea: heyteaData as unknown as LevelConfig,
      mixue: mixueData as unknown as LevelConfig,
    }
    this.registry.set('levels', levels)
    this.registry.set('muted', false)
    this.scene.start('MenuScene')
  }
}
