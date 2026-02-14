import { useEffect, useMemo, useState } from 'react'

type Cell = {
  id: number
  row: number
  col: number
  value: number | null
}

const GRID_ROWS = 12
const GRID_COLS = 16
const MIN_VALUE = 1
const MAX_VALUE = 9
const AUTO_ADD_MS = 3000
const STORAGE_THEME_KEY = 'theme'

const THEMES = [
  { label: 'Blue', value: '59 130 246' },
  { label: 'Slate', value: '71 85 105' },
  { label: 'Emerald', value: '5 150 105' },
  { label: 'Amber', value: '180 83 9' },
]

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function makeCell(row: number, col: number, value: number | null): Cell {
  return { id: row * GRID_COLS + col, row, col, value }
}

function cloneGrid(grid: Cell[]) {
  return grid.map((cell) => ({ ...cell }))
}

function isInside(row: number, col: number) {
  return row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS
}

function getNeighbors(index: number) {
  const row = Math.floor(index / GRID_COLS)
  const col = index % GRID_COLS
  const candidates: Array<[number, number]> = [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ]
  return candidates
    .filter(([nextRow, nextCol]) => isInside(nextRow, nextCol))
    .map(([nextRow, nextCol]) => nextRow * GRID_COLS + nextCol)
}

function findConnectedGroup(grid: Cell[], startIndex: number) {
  const startValue = grid[startIndex]?.value
  if (startValue === null || startValue === undefined) {
    return []
  }

  const visited = new Set<number>()
  const queue = [startIndex]
  const group: number[] = []

  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined || visited.has(current)) {
      continue
    }
    visited.add(current)
    if (grid[current].value !== startValue) {
      continue
    }

    group.push(current)
    for (const next of getNeighbors(current)) {
      if (!visited.has(next) && grid[next].value === startValue) {
        queue.push(next)
      }
    }
  }

  return group
}

function hasAnyMatch(grid: Cell[]) {
  const visited = new Set<number>()
  for (let i = 0; i < grid.length; i += 1) {
    if (visited.has(i) || grid[i].value === null) {
      continue
    }

    const group = findConnectedGroup(grid, i)
    for (const index of group) {
      visited.add(index)
    }
    if (group.length >= 3) {
      return true
    }
  }
  return false
}

function injectGuaranteedMatch(grid: Cell[]) {
  const next = cloneGrid(grid)
  const horizontal = Math.random() < 0.5
  const value = randomInt(MIN_VALUE, MAX_VALUE)

  if (horizontal) {
    const row = randomInt(0, GRID_ROWS - 1)
    const colStart = randomInt(0, GRID_COLS - 3)
    for (let col = colStart; col < colStart + 3; col += 1) {
      next[row * GRID_COLS + col].value = value
    }
    return next
  }

  const rowStart = randomInt(0, GRID_ROWS - 3)
  const col = randomInt(0, GRID_COLS - 1)
  for (let row = rowStart; row < rowStart + 3; row += 1) {
    next[row * GRID_COLS + col].value = value
  }
  return next
}

function createInitialGrid() {
  const fillRate = randomInt(70, 80) / 100
  const grid: Cell[] = []
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const shouldFill = Math.random() < fillRate
      const value = shouldFill ? randomInt(MIN_VALUE, MAX_VALUE) : null
      grid.push(makeCell(row, col, value))
    }
  }

  if (hasAnyMatch(grid)) {
    return grid
  }
  return injectGuaranteedMatch(grid)
}

function addRandomNumber(grid: Cell[]) {
  const emptyIndices = grid
    .map((cell, index) => (cell.value === null ? index : -1))
    .filter((index) => index >= 0)

  if (emptyIndices.length === 0) {
    return grid
  }

  const targetIndex = emptyIndices[randomInt(0, emptyIndices.length - 1)]
  const next = cloneGrid(grid)
  next[targetIndex].value = randomInt(MIN_VALUE, MAX_VALUE)
  return next
}

function isGameOver(grid: Cell[]) {
  const hasEmpty = grid.some((cell) => cell.value === null)
  return !hasEmpty && !hasAnyMatch(grid)
}

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
  onCellClick,
}: {
  cells: Cell[]
  hiddenMode: boolean
  onCellClick: (index: number) => void
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
          return (
            <button
              key={cell.id}
              className="wg-cell"
              type="button"
              onClick={() => onCellClick(index)}
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
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem(STORAGE_THEME_KEY) ?? THEMES[0].value
  })

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
      setCells((prev) => addRandomNumber(prev))
    }, AUTO_ADD_MS)

    return () => window.clearInterval(timer)
  }, [hiddenMode, gameOver])

  const filledCount = useMemo(
    () => cells.reduce((count, cell) => count + (cell.value === null ? 0 : 1), 0),
    [cells],
  )

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
  }

  return (
    <main className="wg-app">
      <Header />
      <Grid cells={cells} hiddenMode={hiddenMode} onCellClick={handleCellClick} />
      <MetricsPanel
        score={score}
        clickCount={clickCount}
        clearCount={clearCount}
        hiddenMode={hiddenMode}
      />
      <div className="wg-footer">
        <ThemeSelector theme={theme} onChange={setTheme} />
        <p>
          Filled Cells: <strong>{filledCount}</strong> / {GRID_ROWS * GRID_COLS}
        </p>
      </div>

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
