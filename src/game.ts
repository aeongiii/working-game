export type Cell = {
  id: number
  row: number
  col: number
  value: number | null
}

export const GRID_ROWS = 35
export const GRID_COLS = 16
export const MOBILE_GRID_ROWS = 24
export const MOBILE_GRID_COLS = 10
export const MIN_VALUE = 1
export const MAX_VALUE = 9
export const AUTO_ADD_MS = 3000

export function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function makeCell(row: number, col: number, value: number | null, cols = GRID_COLS): Cell {
  return { id: row * cols + col, row, col, value }
}

export function cloneGrid(grid: Cell[]) {
  return grid.map((cell) => ({ ...cell }))
}

function isInside(row: number, col: number, rows: number, cols: number) {
  return row >= 0 && row < rows && col >= 0 && col < cols
}

function getNeighbors(index: number, rows: number, cols: number) {
  const row = Math.floor(index / cols)
  const col = index % cols
  const candidates: Array<[number, number]> = [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ]
  return candidates
    .filter(([nextRow, nextCol]) => isInside(nextRow, nextCol, rows, cols))
    .map(([nextRow, nextCol]) => nextRow * cols + nextCol)
}

export function findConnectedGroup(
  grid: Cell[],
  startIndex: number,
  rows = GRID_ROWS,
  cols = GRID_COLS,
) {
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
    for (const next of getNeighbors(current, rows, cols)) {
      if (!visited.has(next) && grid[next].value === startValue) {
        queue.push(next)
      }
    }
  }

  return group
}

export function hasAnyMatch(grid: Cell[], rows = GRID_ROWS, cols = GRID_COLS) {
  const visited = new Set<number>()
  for (let i = 0; i < grid.length; i += 1) {
    if (visited.has(i) || grid[i].value === null) {
      continue
    }

    const group = findConnectedGroup(grid, i, rows, cols)
    for (const index of group) {
      visited.add(index)
    }
    if (group.length >= 3) {
      return true
    }
  }
  return false
}

function injectGuaranteedMatch(grid: Cell[], rows: number, cols: number) {
  const next = cloneGrid(grid)
  const horizontal = Math.random() < 0.5
  const value = randomInt(MIN_VALUE, MAX_VALUE)

  if (horizontal) {
    const row = randomInt(0, rows - 1)
    const colStart = randomInt(0, cols - 3)
    for (let col = colStart; col < colStart + 3; col += 1) {
      next[row * cols + col].value = value
    }
    return next
  }

  const rowStart = randomInt(0, rows - 3)
  const col = randomInt(0, cols - 1)
  for (let row = rowStart; row < rowStart + 3; row += 1) {
    next[row * cols + col].value = value
  }
  return next
}

export function createInitialGrid(rows = GRID_ROWS, cols = GRID_COLS) {
  const grid: Cell[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const value = randomInt(MIN_VALUE, MAX_VALUE)
      grid.push(makeCell(row, col, value, cols))
    }
  }

  if (hasAnyMatch(grid, rows, cols)) {
    return grid
  }
  return injectGuaranteedMatch(grid, rows, cols)
}

export function addRandomNumber(grid: Cell[]) {
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

export function tickGrid(grid: Cell[], rows = GRID_ROWS, cols = GRID_COLS) {
  let next = addRandomNumber(grid)
  if (hasAnyMatch(next, rows, cols)) {
    return next
  }

  // Keep filling a few more empty cells to reduce dead turns.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const withOneMore = addRandomNumber(next)
    if (withOneMore === next) {
      break
    }
    next = withOneMore
    if (hasAnyMatch(next, rows, cols)) {
      break
    }
  }
  return next
}

function shuffle<T>(items: T[]) {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i)
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
  }
  return next
}

export function rearrangeGrid(grid: Cell[], rows = GRID_ROWS, cols = GRID_COLS) {
  const filledValues = grid
    .filter((cell) => cell.value !== null)
    .map((cell) => cell.value as number)

  if (filledValues.length === 0) {
    return grid
  }

  const allIndices = Array.from({ length: grid.length }, (_, index) => index)
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const valuePool = shuffle(filledValues)
    const targetIndices = shuffle(allIndices).slice(0, filledValues.length)
    const targetSet = new Set(targetIndices)
    const next = cloneGrid(grid)

    let valueCursor = 0
    for (let i = 0; i < next.length; i += 1) {
      if (targetSet.has(i)) {
        next[i].value = valuePool[valueCursor]
        valueCursor += 1
      } else {
        next[i].value = null
      }
    }

    if (hasAnyMatch(next, rows, cols)) {
      return next
    }
  }

  return injectGuaranteedMatch(cloneGrid(grid), rows, cols)
}

export function isGameOver(grid: Cell[], rows = GRID_ROWS, cols = GRID_COLS) {
  const hasEmpty = grid.some((cell) => cell.value === null)
  return !hasEmpty && !hasAnyMatch(grid, rows, cols)
}
