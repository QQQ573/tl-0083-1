export class AudioManager {
  private audioContext: AudioContext | null = null
  private bgmOscillator: OscillatorNode | null = null
  private bgmGain: GainNode | null = null
  private bgmInterval: number | null = null
  private currentTempo = 1
  private muted = false
  private isPlayingBgm = false

  constructor() {
    this.initContext()
  }

  private initContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    } catch (e) {
      console.warn('Web Audio API not supported')
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.bgmGain) {
      this.bgmGain.gain.value = muted ? 0 : 0.1
    }
  }

  playSound(type: 'click' | 'correct' | 'wrong' | 'complete'): void {
    if (!this.audioContext || this.muted) return
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }

    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()

    osc.connect(gain)
    gain.connect(this.audioContext.destination)

    switch (type) {
      case 'click':
        osc.frequency.value = 800
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1)
        osc.start()
        osc.stop(this.audioContext.currentTime + 0.1)
        break
      case 'correct':
        osc.frequency.setValueAtTime(523, this.audioContext.currentTime)
        osc.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1)
        osc.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2)
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.4)
        osc.start()
        osc.stop(this.audioContext.currentTime + 0.4)
        break
      case 'wrong':
        osc.frequency.value = 200
        osc.type = 'sawtooth'
        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.25)
        osc.start()
        osc.stop(this.audioContext.currentTime + 0.25)
        break
      case 'complete':
        osc.frequency.setValueAtTime(523, this.audioContext.currentTime)
        osc.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1)
        osc.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2)
        osc.frequency.setValueAtTime(1047, this.audioContext.currentTime + 0.3)
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.6)
        osc.start()
        osc.stop(this.audioContext.currentTime + 0.6)
        break
    }
  }

  startBgm(tempo: number = 1): void {
    if (!this.audioContext || this.isPlayingBgm) return
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }

    this.currentTempo = tempo
    this.isPlayingBgm = true
    this.playBgmLoop()
  }

  setBgmTempo(tempo: number): void {
    if (this.currentTempo === tempo) return
    this.currentTempo = tempo
    this.stopBgmLoop()
    if (this.isPlayingBgm) {
      this.playBgmLoop()
    }
  }

  private playBgmLoop(): void {
    if (!this.audioContext) return

    const notes = this.currentTempo === 1
      ? [262, 294, 330, 349, 392, 440, 494, 523]
      : [330, 370, 415, 440, 494, 554, 622, 659]

    const baseInterval = 400 / this.currentTempo
    let noteIndex = 0

    const playNextNote = () => {
      if (!this.isPlayingBgm || !this.audioContext) return

      const osc = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()

      osc.connect(gain)
      gain.connect(this.audioContext.destination)

      osc.frequency.value = notes[noteIndex % notes.length]
      osc.type = 'triangle'
      gain.gain.setValueAtTime(this.muted ? 0 : 0.06, this.audioContext.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3)

      osc.start()
      osc.stop(this.audioContext.currentTime + 0.3)

      noteIndex++
    }

    playNextNote()
    this.bgmInterval = window.setInterval(playNextNote, baseInterval)
  }

  stopBgm(): void {
    this.isPlayingBgm = false
    this.stopBgmLoop()
  }

  private stopBgmLoop(): void {
    if (this.bgmInterval !== null) {
      clearInterval(this.bgmInterval)
      this.bgmInterval = null
    }
    if (this.bgmOscillator) {
      try {
        this.bgmOscillator.stop()
      } catch (e) {}
      this.bgmOscillator = null
    }
    this.bgmGain = null
  }

  resumeContext(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
  }
}

export const audioManager = new AudioManager()
