export type Cell = {
  id: number
  row: number
  col: number
  value: number | null
}

export const GRID_ROWS = 12
export const GRID_COLS = 16
export const MIN_VALUE = 1
export const MAX_VALUE = 9
export const AUTO_ADD_MS = 3000

export function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function makeCell(row: number, col: number, value: number | null): Cell {
  return { id: row * GRID_COLS + col, row, col, value }
}

export function cloneGrid(grid: Cell[]) {
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

export function findConnectedGroup(grid: Cell[], startIndex: number) {
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

export function hasAnyMatch(grid: Cell[]) {
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

export function createInitialGrid() {
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

export function tickGrid(grid: Cell[]) {
  let next = addRandomNumber(grid)
  if (hasAnyMatch(next)) {
    return next
  }

  // Keep filling a few more empty cells to reduce dead turns.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const withOneMore = addRandomNumber(next)
    if (withOneMore === next) {
      break
    }
    next = withOneMore
    if (hasAnyMatch(next)) {
      break
    }
  }
  return next
}

export function isGameOver(grid: Cell[]) {
  const hasEmpty = grid.some((cell) => cell.value === null)
  return !hasEmpty && !hasAnyMatch(grid)
}
