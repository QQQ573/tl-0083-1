import Phaser from 'phaser'
import type { LevelConfig } from '../types'
import { audioManager } from '../utils/AudioManager'

export class MenuScene extends Phaser.Scene {
  private levels!: Record<string, LevelConfig>

  constructor() {
    super('MenuScene')
  }

  create(): void {
    this.levels = this.registry.get('levels')
    const { width, height } = this.scale

    this.add.rectangle(width / 2, height / 2, width, height, 0x1A1A2E)

    this.add.text(width / 2, 80, '☕ 茶饮咖啡培训模拟器 🧋', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '48px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(width / 2, 140, '三关分别对应星巴克经典咖啡线、喜茶水果茶线、蜜雪冰城平价线', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#AAAAAA',
    }).setOrigin(0.5)

    this.add.text(width / 2, 175, '完成 12 单即可过关，注意顺序！连续三次错误将重做本单', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#888888',
    }).setOrigin(0.5)

    const brands = [
      { id: 'starbucks', emoji: '☕', desc: '经典咖啡线' },
      { id: 'heytea', emoji: '🍇', desc: '水果茶线' },
      { id: 'mixue', emoji: '❄️', desc: '平价线' },
    ]

    brands.forEach((brand, index) => {
      const x = width / 2
      const y = 260 + index * 140
      const level = this.levels[brand.id]

      const card = this.add.rectangle(x, y, 500, 110, 0x2D2D44, 1)
        .setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(level.brandColor).color)
        .setInteractive({ useHandCursor: true })

      this.add.text(x - 200, y, brand.emoji, {
        fontSize: '48px',
      }).setOrigin(0, 0.5)

      this.add.text(x - 120, y - 25, level.brand, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: level.brandColor,
        fontStyle: 'bold',
      }).setOrigin(0, 0.5)

      this.add.text(x - 120, y + 15, brand.desc, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#CCCCCC',
      }).setOrigin(0, 0.5)

      this.add.text(x + 180, y, `${level.timeLimit}秒 / ${level.orderCount}单`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#888888',
      }).setOrigin(1, 0.5)

      card.on('pointerdown', () => {
        audioManager.playSound('click')
        this.startGame(brand.id)
      })

      card.on('pointerover', () => {
        card.setFillStyle(0x3D3D54)
      })

      card.on('pointerout', () => {
        card.setFillStyle(0x2D2D44)
      })
    })

    this.createMuteButton()
    this.add.text(width / 2, height - 40, '点击选择品牌开始培训', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#666666',
    }).setOrigin(0.5)
  }

  private createMuteButton(): void {
    const { width } = this.scale
    const muted = this.registry.get('muted')
    const muteBtn = this.add.text(width - 40, 40, muted ? '🔇' : '🔊', {
      fontSize: '32px',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true })

    muteBtn.on('pointerdown', () => {
      const newMuted = !this.registry.get('muted')
      this.registry.set('muted', newMuted)
      audioManager.setMuted(newMuted)
      muteBtn.setText(newMuted ? '🔇' : '🔊')
    })
  }

  private startGame(levelId: string): void {
    this.scene.start('GameScene', { levelId })
  }
}
