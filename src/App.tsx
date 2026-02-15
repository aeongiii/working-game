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

const COLUMN_LABELS = Array.from({ length: GRID_COLS }, (_, index) =>
  String.fromCharCode(65 + index),
)

function toAddress(index: number) {
  const row = Math.floor(index / GRID_COLS) + 1
  const col = COLUMN_LABELS[index % GRID_COLS] ?? 'A'
  return `${col}${row}`
}

function Header({
  activeAddress,
  hiddenMode,
}: {
  activeAddress: string
  hiddenMode: boolean
}) {
  return (
    <header className="wg-header" aria-label="sheet chrome">
      <div className="wg-appbar">
        <div className="wg-app-left">
          <div className="wg-doc-icon" aria-hidden>
            ▦
          </div>
          <div className="wg-doc-title">제목 없는 스프레드시트</div>
        </div>
        <div className="wg-app-right">
          <button type="button">공유</button>
          <div className="wg-avatar">예은</div>
        </div>
      </div>
      <div className="wg-menubar">
        <span>파일</span>
        <span>수정</span>
        <span>보기</span>
        <span>삽입</span>
        <span>서식</span>
        <span>데이터</span>
        <span>도구</span>
        <span>도움말</span>
      </div>
      <div className="wg-toolbar">
        <span className="tool">↶</span>
        <span className="tool">↷</span>
        <span className="divider" />
        <span className="tool">100%</span>
        <span className="divider" />
        <span className="tool">B</span>
        <span className="tool">I</span>
        <span className="tool">U</span>
        <span className="divider" />
        <span className="tool">⋮</span>
      </div>
      <div className="wg-formula" aria-label="formula bar">
        <div className="wg-namebox">{activeAddress}</div>
        <div className="wg-fx">fx</div>
        <div className="wg-formula-input">
          {hiddenMode ? '0' : "='기호를 입력하고 이름을 입력하여 사용자 스마트 칩을 삽입해 보세요.'"}
        </div>
      </div>
    </header>
  )
}

function Grid({
  cells,
  hiddenMode,
  previewIndices,
  activeIndex,
  onCellClick,
  onCellHover,
  onCellLeave,
}: {
  cells: Cell[]
  hiddenMode: boolean
  previewIndices: Set<number>
  activeIndex: number
  onCellClick: (index: number) => void
  onCellHover: (index: number) => void
  onCellLeave: () => void
}) {
  return (
    <section className="wg-grid-wrap" aria-label="number grid">
      <div className="wg-grid">
        <div className="wg-grid-top">
          <div className="wg-grid-corner" />
          {COLUMN_LABELS.map((label) => (
            <div key={label} className="wg-col-header">
              {label}
            </div>
          ))}
        </div>
        {Array.from({ length: GRID_ROWS }, (_, row) => (
          <div key={`r-${row}`} className="wg-grid-row">
            <div className="wg-row-header">{row + 1}</div>
            {Array.from({ length: GRID_COLS }, (_, col) => {
              const index = row * GRID_COLS + col
              const cell = cells[index]
              const displayValue = hiddenMode ? '0' : cell.value ?? ''
              const isPreview = previewIndices.has(index)
              const isActive = activeIndex === index
              return (
                <button
                  key={cell.id}
                  className={`wg-cell ${isPreview ? 'is-match' : ''} ${isActive ? 'is-active' : ''}`}
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
        ))}
      </div>
    </section>
  )
}

function SheetBar({
  score,
  clickCount,
  clearCount,
  hiddenMode,
  theme,
  onThemeChange,
}: {
  score: number
  clickCount: number
  clearCount: number
  hiddenMode: boolean
  theme: string
  onThemeChange: (value: string) => void
}) {
  const accuracy = clickCount === 0 ? 100 : Math.round((clearCount / clickCount) * 100)
  return (
    <footer className="wg-sheetbar">
      <div className="sheet-tabs">
        <button type="button">+</button>
        <button type="button" className="active">
          시트1
        </button>
      </div>
      <div className="sheet-status">
        <span>Accuracy {hiddenMode ? '--' : `${accuracy}%`}</span>
        <span>Processing {hiddenMode ? '--' : score.toLocaleString()}</span>
        <select value={theme} onChange={(event) => onThemeChange(event.target.value)}>
          {THEMES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </footer>
  )
}

function App() {
  const [cells, setCells] = useState<Cell[]>(() => createInitialGrid())
  const [score, setScore] = useState(0)
  const [clickCount, setClickCount] = useState(0)
  const [clearCount, setClearCount] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [hiddenMode, setHiddenMode] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [previewIndices, setPreviewIndices] = useState<Set<number>>(new Set())
  const [nextTickMs, setNextTickMs] = useState(AUTO_ADD_MS)
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem(STORAGE_THEME_KEY) ?? THEMES[0].value
  })

  const hasMatch = useMemo(() => hasAnyMatch(cells), [cells])
  const activeAddress = useMemo(() => toAddress(activeIndex), [activeIndex])

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

    setActiveIndex(index)
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
    setActiveIndex(0)
    setGameOver(false)
    setHiddenMode(false)
    setPreviewIndices(new Set())
    setNextTickMs(AUTO_ADD_MS)
  }

  return (
    <main className="wg-app">
      <Header activeAddress={activeAddress} hiddenMode={hiddenMode} />
      <Grid
        cells={cells}
        hiddenMode={hiddenMode}
        previewIndices={previewIndices}
        activeIndex={activeIndex}
        onCellClick={handleCellClick}
        onCellHover={handleCellHover}
        onCellLeave={handleCellLeave}
      />
      <div className="wg-runtime">{hiddenMode ? '숨김 모드' : `Auto Sync ${(
        nextTickMs / 1000
      ).toFixed(1)}s`}</div>
      {!gameOver && !hiddenMode && !hasMatch && (
        <p className="wg-note">매칭 가능한 그룹이 없습니다. 자동 반영을 기다리는 중...</p>
      )}
      {gameOver && (
        <section className="wg-gameover" role="alertdialog" aria-label="game over">
          <h2>Recalculation Failed</h2>
          <button type="button" onClick={restart}>
            Restart?
          </button>
        </section>
      )}
      <SheetBar
        score={score}
        clickCount={clickCount}
        clearCount={clearCount}
        hiddenMode={hiddenMode}
        theme={theme}
        onThemeChange={setTheme}
      />
    </main>
  )
}

export default App
