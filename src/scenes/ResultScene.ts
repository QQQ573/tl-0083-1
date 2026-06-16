import Phaser from 'phaser'
import type { GameStats, RankingBrand } from '../types'
import { audioManager } from '../utils/AudioManager'
import { errorBookManager } from '../utils/ErrorBookManager'

interface RankEntry extends RankingBrand {
  isPlayer?: boolean
}

const BRAND_NAME_TO_ID: Record<string, string> = {
  '星巴克': 'starbucks',
  '喜茶': 'heytea',
  '蜜雪冰城': 'mixue',
}

export class ResultScene extends Phaser.Scene {
  private stats!: GameStats
  private levelId!: string

  constructor() {
    super('ResultScene')
  }

  create(): void {
    this.stats = this.registry.get('gameStats')
    this.levelId = BRAND_NAME_TO_ID[this.stats.brandName] || 'starbucks'

    errorBookManager.mergeErrors(this.levelId, this.stats.stepErrors)

    const { width, height } = this.scale
    const brandColor = this.stats.brandColor

    this.add.rectangle(width / 2, height / 2, width, height, 0x1A1A2E)

    this.add.text(width / 2, 60, '🏆 培训结业报告 🏆', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '42px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(width / 2, 100, `${this.stats.brandName} 培训线`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      color: brandColor,
      fontStyle: 'bold',
    }).setOrigin(0.5)

    const completed = this.stats.totalOrders >= 12
    this.add.text(width / 2, 135, completed ? '✅ 恭喜完成全部 12 单！' : `⏰ 时间到！完成 ${this.stats.totalOrders} / 12 单`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: completed ? '#4CAF50' : '#FF9800',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.showAvgTime()
    this.showRanking()
    this.showTopErrors()
    this.showErrorBookSummary()
    this.createButtons()
  }

  private showErrorBookSummary(): void {
    const { width } = this.scale
    const book = errorBookManager.getBrandErrorBook(this.levelId)

    if (book.totalErrors === 0) return

    this.add.text(30, 560, '📚 累计错题本', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#FFD700',
      fontStyle: 'bold',
    })

    const summary = book.drinks.slice(0, 3)
    summary.forEach((d, i) => {
      const y = 590 + i * 26
      this.add.text(30, y, `${i + 1}. ${d.drinkName} (累计错 ${d.totalErrors} 次)`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#FFCC80',
      })
    })
  }

  private showAvgTime(): void {
    const { width } = this.scale
    const avg = this.stats.avgSeconds

    this.add.rectangle(width / 2, 195, 400, 70, 0x2D2D44, 0.8)
    this.add.text(width / 2 - 170, 195, '⏱️ 平均组装时间', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#AAAAAA',
    }).setOrigin(0, 0.5)

    const rating = avg < 7 ? '⚡ 极快' : avg < 10 ? '✅ 优秀' : avg < 14 ? '👍 良好' : '💪 需加强'
    const ratingColor = avg < 7 ? '#4CAF50' : avg < 10 ? '#8BC34A' : avg < 14 ? '#FFC107' : '#FF5722'

    this.add.text(width / 2 + 170, 195, `${avg.toFixed(1)} 秒/单  ${rating}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      color: ratingColor,
      fontStyle: 'bold',
    }).setOrigin(1, 0.5)
  }

  private showRanking(): void {
    const { width } = this.scale
    const startY = 280

    this.add.text(width / 2, startY - 40, '📊 六品牌培训榜模拟排名', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    const brands: RankEntry[] = [
      ...this.stats.rankingBrands,
      { name: '你', avgSeconds: this.stats.playerAvgSeconds, color: '#FFD700', isPlayer: true },
    ]

    brands.sort((a, b) => a.avgSeconds - b.avgSeconds)

    const maxSeconds = Math.max(...brands.map(b => b.avgSeconds))
    const barMaxWidth = 300

    brands.forEach((brand, index) => {
      const y = startY + index * 42
      const barWidth = (brand.avgSeconds / maxSeconds) * barMaxWidth
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`

      this.add.text(width / 2 - 280, y, medal, {
        fontSize: '20px',
      }).setOrigin(0, 0.5)

      const nameStyle = brand.isPlayer ? {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#FFD700',
        fontStyle: 'bold',
      } : {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#FFFFFF',
      }

      this.add.text(width / 2 - 240, y, brand.name, nameStyle).setOrigin(0, 0.5)

      const color = brand.isPlayer ? Phaser.Display.Color.HexStringToColor('#FFD700').color
        : Phaser.Display.Color.HexStringToColor(brand.color).color

      this.add.rectangle(width / 2 - 120, y, barWidth, 24, color, brand.isPlayer ? 1 : 0.7)
        .setOrigin(0, 0.5)

      this.add.text(width / 2 + 200, y, `${brand.avgSeconds.toFixed(1)}s`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#AAAAAA',
      }).setOrigin(1, 0.5)
    })
  }

  private showTopErrors(): void {
    const { width } = this.scale
    const startY = 560

    this.add.text(width / 2, startY - 30, '⚠️ 最易错步骤排行', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    const errors = Object.entries(this.stats.stepErrors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    if (errors.length === 0) {
      this.add.text(width / 2, startY + 20, '🎉 完美！零失误', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#4CAF50',
      }).setOrigin(0.5)
      return
    }

    this.add.rectangle(width / 2, startY + 10 + errors.length * 28, 500, errors.length * 56 + 20, 0x2D2D44, 0.6)

    errors.forEach(([key, count], index) => {
      const y = startY + index * 28
      const [drinkName, stepStr] = key.split('-step')
      const stepIndex = parseInt(stepStr)

      const text = `${index + 1}. ${drinkName} - 第 ${stepIndex + 1} 步  (错误 ${count} 次)`
      this.add.text(width / 2, y, text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: index < 2 ? '#FF6B6B' : index < 4 ? '#FF9800' : '#FFC107',
      }).setOrigin(0.5, 0)
    })
  }

  private createButtons(): void {
    const { width, height } = this.scale

    const backBtn = this.add.rectangle(width / 2 - 220, height - 50, 160, 50, 0x3D3D54, 1)
      .setStrokeStyle(2, 0x6A6A8A)
      .setInteractive({ useHandCursor: true })

    this.add.text(width / 2 - 220, height - 50, '← 返回菜单', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#FFFFFF',
    }).setOrigin(0.5, 0.5)

    backBtn.on('pointerdown', () => {
      audioManager.playSound('click')
      this.scene.start('MenuScene')
    })

    const retryBtn = this.add.rectangle(width / 2, height - 50, 160, 50,
      Phaser.Display.Color.HexStringToColor(this.stats.brandColor).color, 0.8)
      .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(this.stats.brandColor).color)
      .setInteractive({ useHandCursor: true })

    this.add.text(width / 2, height - 50, '🔄 再练一次', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#FFFFFF',
    }).setOrigin(0.5, 0.5)

    retryBtn.on('pointerdown', () => {
      audioManager.playSound('click')
      this.scene.start('GameScene', { levelId: this.levelId })
    })

    const book = errorBookManager.getBrandErrorBook(this.levelId)
    const trainBtn = this.add.rectangle(width / 2 + 220, height - 50, 200, 50,
      book.totalErrors > 0 ? 0xFF9800 : 0x555555, book.totalErrors > 0 ? 0.9 : 0.5)
      .setStrokeStyle(2, book.totalErrors > 0 ? 0xFFC107 : 0x777777)
      .setInteractive({ useHandCursor: book.totalErrors > 0 })

    this.add.text(width / 2 + 220, height - 50, book.totalErrors > 0 ? '🎯 去专项训练' : '暂无错题', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#FFFFFF',
    }).setOrigin(0.5, 0.5)

    if (book.totalErrors > 0) {
      trainBtn.on('pointerdown', () => {
        audioManager.playSound('click')
        this.scene.start('GameScene', { levelId: this.levelId, mode: 'special' })
      })
    }

    const muted = this.registry.get('muted')
    const muteBtn = this.add.text(width - 30, 40, muted ? '🔇' : '🔊', {
      fontSize: '28px',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true })

    muteBtn.on('pointerdown', () => {
      const newMuted = !this.registry.get('muted')
      this.registry.set('muted', newMuted)
      audioManager.setMuted(newMuted)
      muteBtn.setText(newMuted ? '🔇' : '🔊')
    })
  }
}
