const BOARD_SIZE = 5;
const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE;
const PLAYERS = { A: 'A', B: 'B' };
const PLAYER_LABELS = { A: 'الذهبي', B: 'العاجي' };

const DIRECTIONS = [
  { row: -1, col: 0, name: 'up' },
  { row: 1, col: 0, name: 'down' },
  { row: 0, col: -1, name: 'left' },
  { row: 0, col: 1, name: 'right' },
];

function createInitialBoard() {
  return [
    'A', 'A', 'A', 'A', 'A',
    'A', 'A', 'A', 'A', 'A',
    'A', 'A', null, 'B', 'B',
    'B', 'B', 'B', 'B', 'B',
    'B', 'B', 'B', 'B', 'B',
  ];
}

function indexToCoord(index) {
  return { row: Math.floor(index / BOARD_SIZE), col: index % BOARD_SIZE };
}

function isInsideBoard(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function coordToIndex(row, col) {
  return isInsideBoard(row, col) ? row * BOARD_SIZE + col : null;
}

function opponentOf(player) {
  return player === PLAYERS.A ? PLAYERS.B : PLAYERS.A;
}

function countPieces(board) {
  return board.reduce((acc, cell) => {
    if (cell === PLAYERS.A) acc.A += 1;
    if (cell === PLAYERS.B) acc.B += 1;
    return acc;
  }, { A: 0, B: 0 });
}

function getMovesForPiece(board, from, player, options = {}) {
  if (board[from] !== player) return [];
  const { row, col } = indexToCoord(from);
  const opponent = opponentOf(player);
  const normalMoves = [];
  const captureMoves = [];

  for (const direction of DIRECTIONS) {
    const oneIndex = coordToIndex(row + direction.row, col + direction.col);
    const twoIndex = coordToIndex(row + direction.row * 2, col + direction.col * 2);

    if (oneIndex !== null && board[oneIndex] === null) {
      normalMoves.push({ from, to: oneIndex, type: 'move', capture: null, direction: direction.name });
    }

    if (oneIndex !== null && twoIndex !== null && board[oneIndex] === opponent && board[twoIndex] === null) {
      captureMoves.push({ from, to: twoIndex, type: 'capture', capture: oneIndex, direction: direction.name });
    }
  }

  if (options.onlyCaptures) return captureMoves;
  return [...captureMoves, ...normalMoves];
}

function getCaptureMovesForPiece(board, from, player) {
  return getMovesForPiece(board, from, player, { onlyCaptures: true });
}

function hasMoreCaptures(board, from, player) {
  return getCaptureMovesForPiece(board, from, player).length > 0;
}

function getAllMoves(board, player, options = {}) {
  const allMoves = [];
  const captureMoves = [];
  board.forEach((cell, index) => {
    if (cell !== player) return;
    for (const move of getMovesForPiece(board, index, player)) {
      allMoves.push(move);
      if (move.type === 'capture') captureMoves.push(move);
    }
  });
  if (options.onlyCaptures) return captureMoves;
  return options.forcedCapture && captureMoves.length > 0 ? captureMoves : allMoves;
}

function applyMove(board, move, player) {
  if (!move || board[move.from] !== player || board[move.to] !== null) return { ok: false, board, reason: 'invalid-move' };
  const legal = getMovesForPiece(board, move.from, player).some(
    (candidate) => candidate.to === move.to && candidate.capture === move.capture && candidate.type === move.type
  );
  if (!legal) return { ok: false, board, reason: 'illegal-move' };
  const nextBoard = [...board];
  nextBoard[move.from] = null;
  nextBoard[move.to] = player;
  if (move.type === 'capture' && move.capture !== null) nextBoard[move.capture] = null;
  return { ok: true, board: nextBoard, reason: null };
}

function findMove(board, player, from, to, options = {}) {
  return getMovesForPiece(board, from, player, options).find((move) => move.to === to) || null;
}

function getGameStatus(board, currentPlayer, options = {}) {
  const pieces = countPieces(board);
  if (pieces.A === 0) return { ended: true, winner: PLAYERS.B, reason: 'captured-all' };
  if (pieces.B === 0) return { ended: true, winner: PLAYERS.A, reason: 'captured-all' };
  if (getAllMoves(board, currentPlayer, options).length === 0) {
    return { ended: true, winner: opponentOf(currentPlayer), reason: 'blocked' };
  }
  return { ended: false, winner: null, reason: null };
}

function getMoveHintText(move) {
  if (!move) return '';
  return move.type === 'capture' ? 'قفزة قاتلة' : 'حركة آمنة';
}

function updateDonkeyScores(scores, winner, loser) {
  const nextScores = { ...scores };
  if (nextScores[winner] > 0) {
    nextScores[winner] -= 1;
  } else {
    nextScores[loser] += 1;
  }
  return nextScores;
}

module.exports = {
  BOARD_SIZE,
  TOTAL_CELLS,
  PLAYERS,
  PLAYER_LABELS,
  createInitialBoard,
  indexToCoord,
  coordToIndex,
  isInsideBoard,
  opponentOf,
  countPieces,
  getMovesForPiece,
  getCaptureMovesForPiece,
  hasMoreCaptures,
  getAllMoves,
  applyMove,
  findMove,
  getGameStatus,
  getMoveHintText,
  updateDonkeyScores,
};
