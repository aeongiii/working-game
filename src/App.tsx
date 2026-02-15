import { useEffect, useMemo, useState } from 'react'
import { GRID_COLS, GRID_ROWS, cloneGrid, createInitialGrid, findConnectedGroup, type Cell } from './game'

const STORAGE_THEME_KEY = 'theme'
const MISS_PENALTY = 2

const THEMES = [
  { label: 'Blue', value: '59 130 246' },
  { label: 'Slate', value: '71 85 105' },
  { label: 'Emerald', value: '5 150 105' },
  { label: 'Amber', value: '180 83 9' },
]

const DIFFICULTIES = {
  easy: { label: 'Easy', roundMs: 90000 },
  normal: { label: 'Normal', roundMs: 60000 },
  hard: { label: 'Hard', roundMs: 45000 },
} as const

type Difficulty = keyof typeof DIFFICULTIES
type GamePhase = 'ready' | 'running' | 'paused' | 'ended'

const COLUMN_LABELS = Array.from({ length: GRID_COLS }, (_, index) =>
  String.fromCharCode(65 + index),
)

function toAddress(index: number) {
  const row = Math.floor(index / GRID_COLS) + 1
  const col = COLUMN_LABELS[index % GRID_COLS] ?? 'A'
  return `${col}${row}`
}

function toClock(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const min = Math.floor(totalSeconds / 60)
  const sec = totalSeconds % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function toRgba(rgb: string, alpha: number) {
  const parts = rgb
    .trim()
    .split(/\s+/)
    .map((item) => Number(item))
  return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`
}

function WorkingGameLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" fill="none" stroke="#5f6368" />
      <path d="M8 8H16M8 12H16M8 16H12" fill="none" stroke="#5f6368" strokeLinecap="round" />
    </svg>
  )
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
          <div className="wg-doc-icon">
            <WorkingGameLogo />
          </div>
          <div className="wg-doc-title">제목 없는 스프레드시트</div>
        </div>
        <div className="wg-app-right">
          <button type="button" className="wg-login-btn">
            로그인
          </button>
          <button type="button" className="wg-profile-btn">
            <span aria-hidden>◯</span>
            프로필
          </button>
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
          {hiddenMode ? '0' : "='3개 이상 인접한 셀을 클릭해 제거하세요.'"}
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
        <span className="theme-label">Theme</span>
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
  const [previewIndices, setPreviewIndices] = useState<Set<number>>(new Set())
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [lockedDifficulty, setLockedDifficulty] = useState<Difficulty>('normal')
  const [phase, setPhase] = useState<GamePhase>('ready')
  const [timeLeftMs, setTimeLeftMs] = useState<number>(DIFFICULTIES.normal.roundMs)
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem(STORAGE_THEME_KEY) ?? THEMES[0].value
  })

  const activeAddress = useMemo(() => toAddress(activeIndex), [activeIndex])
  const isRoundOver = phase === 'ended'

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', theme)
    document.documentElement.style.setProperty('--chrome-accent-soft', toRgba(theme, 0.08))
    document.documentElement.style.setProperty('--chrome-accent-mid', toRgba(theme, 0.14))
    document.documentElement.style.setProperty('--chrome-accent-strong', toRgba(theme, 0.2))
    localStorage.setItem(STORAGE_THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    if (phase === 'ready') {
      setTimeLeftMs(DIFFICULTIES[difficulty].roundMs)
    }
  }, [difficulty, phase])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F9') {
        event.preventDefault()
        setHiddenMode((prev) => !prev)
        return
      }

      if (event.code === 'Space' && isRoundOver) {
        event.preventDefault()
        setCells(createInitialGrid())
        setScore(0)
        setClickCount(0)
        setClearCount(0)
        setActiveIndex(0)
        setHiddenMode(false)
        setPreviewIndices(new Set())
        setTimeLeftMs(DIFFICULTIES[lockedDifficulty].roundMs)
        setPhase('running')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isRoundOver, lockedDifficulty])

  useEffect(() => {
    if (hiddenMode || phase !== 'running') {
      return
    }

    const timer = window.setInterval(() => {
      setTimeLeftMs((prev) => {
        const next = Math.max(0, prev - 100)
        if (next === 0) {
          setPhase('ended')
        }
        return next
      })
    }, 100)

    return () => window.clearInterval(timer)
  }, [hiddenMode, phase])

  const canPlay = phase === 'running' && !hiddenMode

  const handleCellHover = (index: number) => {
    if (!canPlay) {
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
    if (!canPlay) {
      return
    }

    setActiveIndex(index)
    setClickCount((prev) => prev + 1)

    const value = cells[index].value
    if (value === null) {
      setScore((prev) => Math.max(0, prev - MISS_PENALTY))
      return
    }

    const group = findConnectedGroup(cells, index)
    if (group.length < 3) {
      setScore((prev) => Math.max(0, prev - MISS_PENALTY))
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

  const startGame = () => {
    setLockedDifficulty(difficulty)
    setCells(createInitialGrid())
    setScore(0)
    setClickCount(0)
    setClearCount(0)
    setActiveIndex(0)
    setHiddenMode(false)
    setPreviewIndices(new Set())
    setTimeLeftMs(DIFFICULTIES[difficulty].roundMs)
    setPhase('running')
  }

  const restart = () => {
    setCells(createInitialGrid())
    setScore(0)
    setClickCount(0)
    setClearCount(0)
    setActiveIndex(0)
    setHiddenMode(false)
    setPreviewIndices(new Set())
    setTimeLeftMs(DIFFICULTIES[lockedDifficulty].roundMs)
    setPhase('running')
  }

  const togglePause = () => {
    if (phase === 'running') {
      setPhase('paused')
      return
    }
    if (phase === 'paused') {
      setPhase('running')
    }
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
      <div className="wg-runtime">
        <div className="wg-runtime-main">
          <span className="metric">
            <strong>Score</strong>
            <span>{score.toLocaleString()}</span>
          </span>
          <span className="metric">
            <strong>Time</strong>
            <span>{toClock(timeLeftMs)}</span>
          </span>
          <span className="metric">
            <strong>Mode</strong>
            <select
              value={phase === 'ready' ? difficulty : lockedDifficulty}
              onChange={(event) => setDifficulty(event.target.value as Difficulty)}
              disabled={phase !== 'ready'}
            >
              <option value="easy">easy</option>
              <option value="normal">normal</option>
              <option value="hard">hard</option>
            </select>
            {phase === 'ready' && (
              <button type="button" className="wg-start-btn" onClick={startGame}>
                start
              </button>
            )}
          </span>
        </div>
        <div className="wg-runtime-controls">
          {(phase === 'running' || phase === 'paused') && (
            <>
              <button type="button" onClick={togglePause}>
                {phase === 'paused' ? 'resume' : 'pause'}
              </button>
              <button type="button" onClick={restart}>
                retry
              </button>
            </>
          )}
        </div>
      </div>
      {isRoundOver && (
        <div className="wg-round-result" role="status">
          <span>Final {score.toLocaleString()}</span>
          <button type="button" onClick={restart}>
            retry
          </button>
          <span>space</span>
        </div>
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
