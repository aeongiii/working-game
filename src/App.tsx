import { useEffect, useMemo, useState } from 'react'
import {
  AUTO_ADD_MS,
  GRID_COLS,
  GRID_ROWS,
  cloneGrid,
  createInitialGrid,
  findConnectedGroup,
  hasAnyMatch,
  isGameOver,
  tickGrid,
  type Cell,
} from './game'

const STORAGE_THEME_KEY = 'theme'

const THEMES = [
  { label: 'Blue', value: '59 130 246' },
  { label: 'Slate', value: '71 85 105' },
  { label: 'Emerald', value: '5 150 105' },
  { label: 'Amber', value: '180 83 9' },
]

function Header() {
  return (
    <header className="wg-header">
      <h1>Internal Sheet</h1>
      <div className="saved-indicator" aria-label="saved">
        Saved <span aria-hidden>●</span>
      </div>
    </header>
  )
}

function Grid({
  cells,
  hiddenMode,
  previewIndices,
  onCellClick,
  onCellHover,
  onCellLeave,
}: {
  cells: Cell[]
  hiddenMode: boolean
  previewIndices: Set<number>
  onCellClick: (index: number) => void
  onCellHover: (index: number) => void
  onCellLeave: () => void
}) {
  return (
    <section className="wg-grid-wrap" aria-label="number grid">
      <div
        className="wg-grid"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
        }}
      >
        {cells.map((cell, index) => {
          const displayValue = hiddenMode ? '0' : cell.value ?? ''
          const isPreview = previewIndices.has(index)
          return (
            <button
              key={cell.id}
              className={`wg-cell ${isPreview ? 'is-match' : ''}`}
              type="button"
              onClick={() => onCellClick(index)}
              onMouseEnter={() => onCellHover(index)}
              onMouseLeave={onCellLeave}
            >
              {displayValue}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function MetricsPanel({
  score,
  clickCount,
  clearCount,
  hiddenMode,
}: {
  score: number
  clickCount: number
  clearCount: number
  hiddenMode: boolean
}) {
  const accuracy = clickCount === 0 ? 100 : Math.round((clearCount / clickCount) * 100)
  const variance = Math.max(0, 100 - accuracy)

  return (
    <section className="wg-metrics" aria-label="kpi panel">
      <div>
        <span>Accuracy</span>
        <strong>{hiddenMode ? '--' : `${accuracy}%`}</strong>
      </div>
      <div>
        <span>Variance</span>
        <strong>{hiddenMode ? '--' : `${variance}%`}</strong>
      </div>
      <div>
        <span>Processing</span>
        <strong>{hiddenMode ? '--' : score.toLocaleString()}</strong>
      </div>
    </section>
  )
}

function ThemeSelector({
  theme,
  onChange,
}: {
  theme: string
  onChange: (value: string) => void
}) {
  return (
    <section className="wg-theme">
      <label htmlFor="theme-selector">Accent</label>
      <select
        id="theme-selector"
        value={theme}
        onChange={(event) => onChange(event.target.value)}
      >
        {THEMES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </section>
  )
}

function App() {
  const [cells, setCells] = useState<Cell[]>(() => createInitialGrid())
  const [score, setScore] = useState(0)
  const [clickCount, setClickCount] = useState(0)
  const [clearCount, setClearCount] = useState(0)
  const [hiddenMode, setHiddenMode] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [previewIndices, setPreviewIndices] = useState<Set<number>>(new Set())
  const [nextTickMs, setNextTickMs] = useState(AUTO_ADD_MS)
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem(STORAGE_THEME_KEY) ?? THEMES[0].value
  })

  const hasMatch = useMemo(() => hasAnyMatch(cells), [cells])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', theme)
    localStorage.setItem(STORAGE_THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    setGameOver(isGameOver(cells))
  }, [cells])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F9') {
        event.preventDefault()
        setHiddenMode((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (hiddenMode || gameOver) {
      return
    }

    const timer = window.setInterval(() => {
      setCells((prev) => tickGrid(prev))
      setNextTickMs(AUTO_ADD_MS)
    }, AUTO_ADD_MS)

    return () => window.clearInterval(timer)
  }, [hiddenMode, gameOver])

  useEffect(() => {
    if (hiddenMode || gameOver) {
      return
    }

    const countdown = window.setInterval(() => {
      setNextTickMs((prev) => (prev <= 100 ? AUTO_ADD_MS : prev - 100))
    }, 100)

    return () => window.clearInterval(countdown)
  }, [hiddenMode, gameOver])

  const filledCount = useMemo(
    () => cells.reduce((count, cell) => count + (cell.value === null ? 0 : 1), 0),
    [cells],
  )

  const handleCellHover = (index: number) => {
    if (hiddenMode || gameOver) {
      return
    }

    const group = findConnectedGroup(cells, index)
    if (group.length >= 3) {
      setPreviewIndices(new Set(group))
      return
    }
    setPreviewIndices(new Set())
  }

  const handleCellLeave = () => {
    setPreviewIndices(new Set())
  }

  const handleCellClick = (index: number) => {
    if (hiddenMode || gameOver) {
      return
    }

    setClickCount((prev) => prev + 1)
    const value = cells[index].value
    if (value === null) {
      return
    }

    const group = findConnectedGroup(cells, index)
    if (group.length < 3) {
      return
    }

    setCells((prev) => {
      const next = cloneGrid(prev)
      for (const targetIndex of group) {
        next[targetIndex].value = null
      }
      return next
    })
    setPreviewIndices(new Set())
    setScore((prev) => prev + value * group.length)
    setClearCount((prev) => prev + 1)
  }

  const restart = () => {
    setCells(createInitialGrid())
    setScore(0)
    setClickCount(0)
    setClearCount(0)
    setGameOver(false)
    setHiddenMode(false)
    setPreviewIndices(new Set())
    setNextTickMs(AUTO_ADD_MS)
  }

  return (
    <main className="wg-app">
      <Header />
      <Grid
        cells={cells}
        hiddenMode={hiddenMode}
        previewIndices={previewIndices}
        onCellClick={handleCellClick}
        onCellHover={handleCellHover}
        onCellLeave={handleCellLeave}
      />
      <MetricsPanel
        score={score}
        clickCount={clickCount}
        clearCount={clearCount}
        hiddenMode={hiddenMode}
      />
      <div className="wg-footer">
        <ThemeSelector theme={theme} onChange={setTheme} />
        <p className="wg-footer-stat">
          Filled Cells: <strong>{filledCount}</strong> / {GRID_ROWS * GRID_COLS}
        </p>
        <p className="wg-footer-stat">
          Sync ETA: <strong>{hiddenMode ? '--' : `${(nextTickMs / 1000).toFixed(1)}s`}</strong>
        </p>
      </div>
      {!gameOver && !hiddenMode && !hasMatch && (
        <p className="wg-note">No valid group. Waiting for auto recalculation...</p>
      )}

      {gameOver && (
        <section className="wg-gameover" role="alertdialog" aria-label="game over">
          <h2>Recalculation Failed</h2>
          <button type="button" onClick={restart}>
            Restart?
          </button>
        </section>
      )}
    </main>
  )
}

export default App
