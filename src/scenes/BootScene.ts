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
    this.load.json('starbucks', starbucksData as unknown as string)
    this.load.json('heytea', heyteaData as unknown as string)
    this.load.json('mixue', mixueData as unknown as string)
  }

  create(): void {
    const levels: Record<string, LevelConfig> = {
      starbucks: this.cache.json.get('starbucks'),
      heytea: this.cache.json.get('heytea'),
      mixue: this.cache.json.get('mixue'),
    }
    this.registry.set('levels', levels)
    this.registry.set('muted', false)
    this.scene.start('MenuScene')
  }
}
