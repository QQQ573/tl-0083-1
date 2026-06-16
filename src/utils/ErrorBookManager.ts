export interface StepErrorEntry {
  drinkName: string
  stepIndex: number
  count: number
}

export interface DrinkErrorSummary {
  drinkName: string
  totalErrors: number
  steps: StepErrorEntry[]
}

export interface BrandErrorBook {
  brandId: string
  totalErrors: number
  drinks: DrinkErrorSummary[]
}

const STORAGE_KEY = 'drink-trainer-error-book-v1'

interface RawErrorBook {
  [brandId: string]: {
    [drinkStepKey: string]: number
  }
}

class ErrorBookManager {
  private data: RawErrorBook = {}

  constructor() {
    this.load()
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        this.data = JSON.parse(raw) as RawErrorBook
      }
    } catch {
      this.data = {}
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data))
    } catch {
    }
  }

  mergeErrors(brandId: string, stepErrors: Record<string, number>): void {
    if (!this.data[brandId]) {
      this.data[brandId] = {}
    }

    Object.entries(stepErrors).forEach(([key, count]) => {
      if (!this.data[brandId][key]) {
        this.data[brandId][key] = 0
      }
      this.data[brandId][key] += count
    })

    this.save()
  }

  getBrandErrorBook(brandId: string): BrandErrorBook {
    const brandData = this.data[brandId] || {}
    const drinkMap: Record<string, StepErrorEntry[]> = {}

    Object.entries(brandData).forEach(([key, count]) => {
      const [drinkName, stepStr] = key.split('-step')
      const stepIndex = parseInt(stepStr)

      if (!drinkMap[drinkName]) {
        drinkMap[drinkName] = []
      }

      drinkMap[drinkName].push({
        drinkName,
        stepIndex,
        count,
      })
    })

    const drinks: DrinkErrorSummary[] = Object.entries(drinkMap).map(([drinkName, steps]) => {
      const totalErrors = steps.reduce((sum, s) => sum + s.count, 0)
      steps.sort((a, b) => b.count - a.count)
      return { drinkName, totalErrors, steps }
    })

    drinks.sort((a, b) => b.totalErrors - a.totalErrors)

    const totalErrors = drinks.reduce((sum, d) => sum + d.totalErrors, 0)

    return { brandId, totalErrors, drinks }
  }

  getAllErrorBook(): { [brandId: string]: BrandErrorBook } {
    const result: { [brandId: string]: BrandErrorBook } = {}
    Object.keys(this.data).forEach(brandId => {
      result[brandId] = this.getBrandErrorBook(brandId)
    })
    return result
  }

  getTotalErrors(): number {
    let total = 0
    Object.values(this.data).forEach(brand => {
      Object.values(brand).forEach(count => {
        total += count
      })
    })
    return total
  }

  clearBrand(brandId: string): void {
    if (this.data[brandId]) {
      delete this.data[brandId]
      this.save()
    }
  }

  clearAll(): void {
    this.data = {}
    this.save()
  }
}

export const errorBookManager = new ErrorBookManager()
