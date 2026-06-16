import Phaser from 'phaser'
import type { LevelConfig, Drink, Step, GameStats, StepType } from '../types'
import { STEP_COLORS } from '../types'
import { audioManager } from '../utils/AudioManager'

interface DraggableItem {
  container: Phaser.GameObjects.Container
  step: Step
  originalX: number
  originalY: number
  onBelt: boolean
}

export class GameScene extends Phaser.Scene {
  private level!: LevelConfig
  private levelId!: string
  private currentDrinkIndex = 0
  private currentDrink!: Drink
  private currentStepIndex = 0
  private timeRemaining = 0
  private qualityScore = 100
  private consecutiveErrors = 0
  private orderStartTime = 0
  private orderTimes: number[] = []
  private stepErrors: Record<string, number> = {}
  private beltItems: DraggableItem[] = []
  private assembledSteps: Step[] = []
  private tickerTexts: Phaser.GameObjects.Text[] = []
  private assembledContainer!: Phaser.GameObjects.Container
  private beltContainer!: Phaser.GameObjects.Container
  private timeText!: Phaser.GameObjects.Text
  private scoreText!: Phaser.GameObjects.Text
  private currentOrderText!: Phaser.GameObjects.Text
  private stepsGuideContainer!: Phaser.GameObjects.Container
  private isPaused = false
  private isRedoing = false
  private bgmTempo = 1
  private lastBeltSpawn = 0
  private beltSpeed = 1.2

  constructor() {
    super('GameScene')
  }

  init(data: { levelId: string }): void {
    this.levelId = data.levelId
    this.level = this.registry.get('levels')[data.levelId]
    this.timeRemaining = this.level.timeLimit
    this.currentDrinkIndex = 0
    this.currentStepIndex = 0
    this.qualityScore = 100
    this.consecutiveErrors = 0
    this.orderTimes = []
    this.stepErrors = {}
    this.assembledSteps = []
    this.beltItems = []
    this.isRedoing = false
  }

  create(): void {
    const { width, height } = this.scale
    const brandColor = Phaser.Display.Color.HexStringToColor(this.level.brandColor).color

    this.add.rectangle(width / 2, height / 2, width, height, 0x1A1A2E)
    this.add.rectangle(width / 2, 70, width, 70, brandColor, 0.3)

    this.createHUD()
    this.createTicker()
    this.createAssemblyZone()
    this.createBelt()
    this.createStepsGuide()

    this.nextDrink()
    this.orderStartTime = this.time.now

    audioManager.setMuted(this.registry.get('muted'))
    audioManager.startBgm(1)

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.updateTimer(),
    })

    this.createMuteButton()
  }

  private createHUD(): void {
    const { width } = this.scale
    const brandColor = this.level.brandColor

    this.add.text(30, 70, `${this.level.brand} - 培训模式`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      color: brandColor,
      fontStyle: 'bold',
    }).setOrigin(0, 0.5)

    this.timeText = this.add.text(width / 2, 70, `⏱️ ${this.formatTime(this.timeRemaining)}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5)

    this.scoreText = this.add.text(width - 30, 70, `品质: ${this.qualityScore}分`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#4CAF50',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5)

    this.currentOrderText = this.add.text(30, 120, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    })
  }

  private createTicker(): void {
    const { width } = this.scale
    const tickerY = 165

    this.add.rectangle(width / 2, tickerY, width, 40, 0x2D2D44, 0.8)
    this.add.text(20, tickerY, '📋 订单队列:', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#AAAAAA',
    }).setOrigin(0, 0.5)

    const upcomingDrinks = this.level.drinks.slice(this.currentDrinkIndex, this.currentDrinkIndex + 5)
    const tickerStr = upcomingDrinks.map((d, i) =>
      i === 0 ? `[${d.name} ${d.modifier}]` : `${d.name} ${d.modifier}`
    ).join('   •   ')

    const tickerText = this.add.text(180, tickerY, tickerStr, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#FFFFFF',
    }).setOrigin(0, 0.5)

    this.tickerTexts.push(tickerText)

    this.tweens.add({
      targets: tickerText,
      x: -1000,
      duration: 20000,
      ease: 'Linear',
      loop: -1,
    })
  }

  private updateTicker(): void {
    this.tickerTexts.forEach(t => t.destroy())
    this.tickerTexts = []

    const { width } = this.scale
    const tickerY = 165
    const startX = width + 200

    const upcomingDrinks = this.level.drinks.slice(this.currentDrinkIndex, this.currentDrinkIndex + 6)
    const displayDrinks = [...upcomingDrinks]
    while (displayDrinks.length < 6) {
      displayDrinks.push(...upcomingDrinks)
    }

    const tickerStr = displayDrinks.map((d, i) =>
      i === 0 ? `▶ [${d.name} ${d.modifier}]` : `${d.name} ${d.modifier}`
    ).join('   •   ')

    const tickerText = this.add.text(startX, tickerY, tickerStr, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#FFFFFF',
    }).setOrigin(0, 0.5)

    this.tickerTexts.push(tickerText)

    this.tweens.add({
      targets: tickerText,
      x: -2000,
      duration: 30000,
      ease: 'Linear',
    })
  }

  private createAssemblyZone(): void {
    const { width, height } = this.scale
    const zoneY = height - 120

    this.add.rectangle(width / 2, zoneY, 500, 100, 0x3D3D54, 0.6)
      .setStrokeStyle(2, 0xFFFFFF, 0.3)

    this.add.text(width / 2, zoneY - 45, '✅ 出品区 (拖入此处)', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#AAAAAA',
    }).setOrigin(0.5, 0.5)

    this.assembledContainer = this.add.container(width / 2 - 200, zoneY)
  }

  private createBelt(): void {
    const { width, height } = this.scale
    const beltY = height - 260

    this.add.rectangle(width / 2, beltY, width, 80, 0x4A4A6A, 0.4)
    this.add.rectangle(width / 2, beltY + 35, width, 4, 0x6A6A8A)

    this.add.text(30, beltY - 45, '🔄 传送带 (拖拽配料到出品区)', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#AAAAAA',
    })

    this.beltContainer = this.add.container(0, beltY)
  }

  private createStepsGuide(): void {
    const { width } = this.scale
    this.stepsGuideContainer = this.add.container(30, 220)
  }

  private updateStepsGuide(): void {
    this.stepsGuideContainer.removeAll(true)

    const title = this.add.text(0, 0, '📝 当前配方步骤:', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    })
    this.stepsGuideContainer.add(title)

    this.currentDrink.steps.forEach((step, index) => {
      const y = 35 + index * 32
      const isCompleted = index < this.currentStepIndex
      const isCurrent = index === this.currentStepIndex

      const color = isCompleted ? '#4CAF50' : isCurrent ? '#FFD700' : '#888888'
      const prefix = isCompleted ? '✓' : isCurrent ? '→' : '○'

      const stepText = this.add.text(0, y, `${prefix} ${step.emoji} ${step.name}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color,
      })
      this.stepsGuideContainer.add(stepText)
    })

    if (this.consecutiveErrors > 0) {
      const errorY = 35 + this.currentDrink.steps.length * 32 + 10
      const errorText = this.add.text(0, errorY, `⚠️ 连续错误: ${this.consecutiveErrors}/3`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#FF6B6B',
      })
      this.stepsGuideContainer.add(errorText)
    }

    const { width } = this.scale
    const progressX = width - 200
    const progressY = 220
    this.add.rectangle(progressX, progressY, 150, 120, 0x2D2D44, 0.6)
    this.add.text(progressX, progressY - 40, `进度`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#AAAAAA',
    }).setOrigin(0.5, 0.5)
    this.add.text(progressX, progressY, `${this.currentDrinkIndex + 1} / ${this.level.orderCount}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '32px',
      color: this.level.brandColor,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5)
    this.add.text(progressX, progressY + 35, `已完成 ${this.currentDrinkIndex} 单`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#888888',
    }).setOrigin(0.5, 0.5)
  }

  private nextDrink(): void {
    if (this.currentDrinkIndex >= this.level.orderCount) {
      this.finishGame()
      return
    }

    this.currentDrink = this.level.drinks[this.currentDrinkIndex]
    this.currentStepIndex = 0
    this.consecutiveErrors = 0
    this.assembledSteps = []
    this.assembledContainer.removeAll(true)

    const modifierText = this.currentDrink.modifier ? ` (${this.currentDrink.modifier})` : ''
    this.currentOrderText.setText(`正在制作: ${this.currentDrink.name}${modifierText}`)

    this.clearBelt()
    this.spawnBeltItems()
    this.updateStepsGuide()
    this.updateTicker()
  }

  private spawnBeltItems(): void {
    const { width } = this.scale
    const items: Step[] = [...this.currentDrink.steps]
    const distractors = this.currentDrink.distractors || []
    items.push(...distractors)
    Phaser.Utils.Array.Shuffle(items)

    items.forEach((step, index) => {
      const x = width + 100 + index * 130
      this.createBeltItem(step, x)
    })
  }

  private createBeltItem(step: Step, x: number): void {
    const color = STEP_COLORS[step.type] || 0x888888
    const container = this.add.container(x, 0)

    const bg = this.add.rectangle(0, 0, 75, 70, color, 0.9)
      .setStrokeStyle(2, 0xFFFFFF, 0.5)
    const emoji = this.add.text(0, -10, step.emoji, { fontSize: '32px' }).setOrigin(0.5)
    const name = this.add.text(0, 22, step.name, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    container.add([bg, emoji, name])
    container.setSize(75, 70)
    container.setInteractive({ draggable: true, useHandCursor: true })

    const item: DraggableItem = {
      container,
      step,
      originalX: x,
      originalY: 0,
      onBelt: true,
    }

    this.beltItems.push(item)
    this.beltContainer.add(container)

    this.input.setDraggable(container)

    container.on('dragstart', () => {
      container.setScale(1.1)
      bg.setStrokeStyle(3, 0xFFD700)
    })

    container.on('drag', (_: unknown, dragX: number, dragY: number) => {
      const parent = container.parentContainer as Phaser.GameObjects.Container
      if (parent) {
        container.x = dragX - parent.x
        container.y = dragY - parent.y
      } else {
        container.x = dragX
        container.y = dragY
      }
    })

    container.on('dragend', () => {
      container.setScale(1)
      bg.setStrokeStyle(2, 0xFFFFFF, 0.5)

      const worldX = container.x + (container.parentContainer?.x || 0)
      const worldY = container.y + (container.parentContainer?.y || 0)
      const { height, width } = this.scale
      const zoneY = height - 120

      if (Math.abs(worldY - zoneY) < 60 && worldX > width / 2 - 250 && worldX < width / 2 + 250) {
        this.handleDrop(item, worldX, worldY)
      } else {
        container.x = item.originalX
        container.y = item.originalY
      }
    })
  }

  private handleDrop(item: DraggableItem, worldX: number, worldY: number): void {
    const expectedStep = this.currentDrink.steps[this.currentStepIndex]

    if (item.step.id === expectedStep.id) {
      this.handleCorrectStep(item, worldX, worldY)
    } else {
      this.handleWrongStep(item)
    }
  }

  private handleCorrectStep(item: DraggableItem, _worldX: number, _worldY: number): void {
    audioManager.playSound('correct')

    this.consecutiveErrors = 0
    this.assembledSteps.push(item.step)
    this.currentStepIndex++

    this.beltContainer.remove(item.container)
    this.beltItems = this.beltItems.filter(i => i !== item)

    const localX = this.assembledSteps.length * 70 - 35
    item.container.x = localX
    item.container.y = 0
    item.container.disableInteractive()
    this.assembledContainer.add(item.container)

    this.cameras.main.flash(100, 76, 175, 80, true)
    this.updateStepsGuide()

    if (this.currentStepIndex >= this.currentDrink.steps.length) {
      this.completeOrder()
    }
  }

  private handleWrongStep(item: DraggableItem): void {
    audioManager.playSound('wrong')

    this.consecutiveErrors++
    this.qualityScore = Math.max(0, this.qualityScore - 5)
    this.scoreText.setText(`品质: ${this.qualityScore}分`)
    this.scoreText.setColor(this.qualityScore > 60 ? '#4CAF50' : this.qualityScore > 30 ? '#FF9800' : '#FF5252')

    const errorKey = `${this.currentDrink.name}-step${this.currentStepIndex}`
    this.stepErrors[errorKey] = (this.stepErrors[errorKey] || 0) + 1

    this.cameras.main.shake(200, 0.01)

    item.container.x = item.originalX
    item.container.y = item.originalY

    this.updateStepsGuide()

    if (this.consecutiveErrors >= 3) {
      this.triggerRedo()
    }
  }

  private triggerRedo(): void {
    this.isRedoing = true
    this.consecutiveErrors = 0

    const { width, height } = this.scale
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
    const text = this.add.text(width / 2, height / 2, '⚠️ 连续三次错误！重做本单（不扣分，耗时+15秒）', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      color: '#FF6B6B',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.timeRemaining = Math.max(0, this.timeRemaining - 15)
    this.updateTimerDisplay()

    this.time.delayedCall(1500, () => {
      overlay.destroy()
      text.destroy()

      this.assembledContainer.removeAll(true)
      this.assembledSteps = []
      this.currentStepIndex = 0
      this.isRedoing = false

      this.clearBelt()
      this.spawnBeltItems()
      this.updateStepsGuide()
    })
  }

  private completeOrder(): void {
    const orderTime = (this.time.now - this.orderStartTime) / 1000
    this.orderTimes.push(orderTime)

    audioManager.playSound('complete')

    this.currentDrinkIndex++
    this.orderStartTime = this.time.now

    const { width, height } = this.scale
    const feedback = this.add.text(width / 2, height / 2 - 50, `✅ 完成！用时 ${orderTime.toFixed(1)} 秒`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '36px',
      color: '#4CAF50',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.time.delayedCall(800, () => {
      feedback.destroy()
      this.nextDrink()
    })
  }

  private clearBelt(): void {
    this.beltItems.forEach(item => item.container.destroy())
    this.beltItems = []
  }

  private updateTimer(): void {
    if (this.isPaused || this.isRedoing) return

    this.timeRemaining--
    this.updateTimerDisplay()

    if (this.timeRemaining <= 25 && this.bgmTempo === 1) {
      this.bgmTempo = 1.5
      this.beltSpeed = 2
      audioManager.setBgmTempo(1.5)
    }

    if (this.timeRemaining <= 0) {
      this.finishGame()
    }
  }

  private updateTimerDisplay(): void {
    this.timeText.setText(`⏱️ ${this.formatTime(this.timeRemaining)}`)
    if (this.timeRemaining <= 25) {
      this.timeText.setColor('#FF5252')
    } else if (this.timeRemaining <= 50) {
      this.timeText.setColor('#FF9800')
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  private createMuteButton(): void {
    const { width } = this.scale
    const muted = this.registry.get('muted')
    const muteBtn = this.add.text(width - 30, 120, muted ? '🔇' : '🔊', {
      fontSize: '28px',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true })

    muteBtn.on('pointerdown', () => {
      const newMuted = !this.registry.get('muted')
      this.registry.set('muted', newMuted)
      audioManager.setMuted(newMuted)
      muteBtn.setText(newMuted ? '🔇' : '🔊')
    })

    const backBtn = this.add.text(width - 30, 160, '← 返回', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#888888',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true })

    backBtn.on('pointerdown', () => {
      audioManager.stopBgm()
      this.scene.start('MenuScene')
    })
  }

  update(_time: number, delta: number): void {
    if (this.isPaused || this.isRedoing) return

    this.beltItems.forEach(item => {
      if (item.onBelt) {
        item.originalX -= this.beltSpeed * (delta / 16)
        item.container.x = item.originalX

        if (item.originalX < -50) {
          item.originalX = this.scale.width + 100 + Phaser.Math.Between(0, 200)
        }
      }
    })
  }

  private finishGame(): void {
    this.isPaused = true
    audioManager.stopBgm()

    const avgSeconds = this.orderTimes.length > 0
      ? this.orderTimes.reduce((a, b) => a + b, 0) / this.orderTimes.length
      : 0

    const sortedErrors = Object.entries(this.stepErrors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    const stats: GameStats = {
      avgSeconds,
      totalOrders: this.currentDrinkIndex,
      stepErrors: this.stepErrors,
      brandName: this.level.brand,
      brandColor: this.level.brandColor,
      playerAvgSeconds: avgSeconds,
      rankingBrands: this.level.rankingBrands,
    }

    this.registry.set('gameStats', stats)
    this.scene.start('ResultScene')
  }
}
