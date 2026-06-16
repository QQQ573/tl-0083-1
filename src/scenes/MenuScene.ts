import Phaser from 'phaser'
import type { LevelConfig } from '../types'
import { audioManager } from '../utils/AudioManager'
import { errorBookManager } from '../utils/ErrorBookManager'

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
      const y = 260 + index * 130
      const level = this.levels[brand.id]
      const book = errorBookManager.getBrandErrorBook(brand.id)
      const hasErrors = book.totalErrors > 0

      const card = this.add.rectangle(x, y, 500, 100, 0x2D2D44, 1)
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
        fontSize: '16px',
        color: '#CCCCCC',
      }).setOrigin(0, 0.5)

      this.add.text(x + 180, y - 25, `${level.timeLimit}秒 / ${level.orderCount}单`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#888888',
      }).setOrigin(1, 0.5)

      if (hasErrors) {
        this.add.text(x + 180, y + 15, `📚 错题 ${book.totalErrors}次 | ${book.drinks.length}款`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          color: '#FF9800',
          fontStyle: 'bold',
        }).setOrigin(1, 0.5)
      } else {
        this.add.text(x + 180, y + 15, `📚 暂无错题记录`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          color: '#666666',
        }).setOrigin(1, 0.5)
      }

      let specialBtnClicked = false

      card.on('pointerdown', () => {
        if (specialBtnClicked) {
          specialBtnClicked = false
          return
        }
        audioManager.playSound('click')
        this.startGame(brand.id)
      })

      card.on('pointerover', () => {
        card.setFillStyle(0x3D3D54)
      })

      card.on('pointerout', () => {
        card.setFillStyle(0x2D2D44)
      })

      const specialBtn = this.add.rectangle(x + 180, y + 15, 120, 36,
        hasErrors ? 0xFF9800 : 0x4A4A6A, hasErrors ? 0.9 : 0.6)
        .setStrokeStyle(2, hasErrors ? 0xFFC107 : 0x6A6A8A)
        .setInteractive({ useHandCursor: hasErrors })

      this.add.text(x + 180, y + 15, hasErrors ? '🎯 专项训练' : '暂无错题', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: hasErrors ? '#FFFFFF' : '#888888',
        fontStyle: 'bold',
      }).setOrigin(0.5)

      if (hasErrors) {
        specialBtn.on('pointerdown', () => {
          specialBtnClicked = true
          audioManager.playSound('click')
          this.startGame(brand.id, true)
        })
      }
    })

    this.createMuteButton()
    this.createClearBookButton()
    this.add.text(width / 2, height - 40, '点击选择品牌开始培训，或点击专项训练优先练习易错饮品', {
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

  private createClearBookButton(): void {
    const totalErrors = errorBookManager.getTotalErrors()
    if (totalErrors === 0) return

    const clearBtn = this.add.text(40, 40, '🗑️ 清空错题本', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#FF6B6B',
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true })

    clearBtn.on('pointerdown', () => {
      errorBookManager.clearAll()
      audioManager.playSound('click')
      this.scene.restart()
    })
  }

  private startGame(levelId: string, isSpecial = false): void {
    const data: { levelId: string; mode?: string } = { levelId }
    if (isSpecial) {
      data.mode = 'special'
    }
    this.scene.start('GameScene', data)
  }
}
