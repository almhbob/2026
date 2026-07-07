import assert from 'node:assert/strict';
import logic from '../src/game/logic.js';

const { createInitialBoard, countPieces, getMovesForPiece, applyMove, PLAYERS } = logic;

const initial = createInitialBoard();
assert.equal(initial.length, 25, 'board must be 5x5');
assert.deepEqual(countPieces(initial), { A: 12, B: 12 }, 'each player starts with 12 dogs');
assert.equal(initial[12], null, 'center must start empty');

const diagonalBoard = Array(25).fill(null);
diagonalBoard[6] = PLAYERS.A;
diagonalBoard[12] = PLAYERS.B;
diagonalBoard[18] = null;
assert.equal(
  getMovesForPiece(diagonalBoard, 6, PLAYERS.A).some((move) => move.to === 18),
  false,
  'diagonal jump must not be legal'
);

const captureBoard = Array(25).fill(null);
captureBoard[10] = PLAYERS.A;
captureBoard[11] = PLAYERS.B;
captureBoard[12] = null;
const captureMove = getMovesForPiece(captureBoard, 10, PLAYERS.A).find((move) => move.to === 12);
assert.equal(captureMove?.type, 'capture', 'horizontal jump over opponent should capture');
const result = applyMove(captureBoard, captureMove, PLAYERS.A);
assert.equal(result.ok, true, 'capture should apply');
assert.equal(result.board[10], null, 'from cell should be empty after move');
assert.equal(result.board[11], null, 'captured opponent should be removed');
assert.equal(result.board[12], PLAYERS.A, 'piece should land in empty cell');

console.log('✅ Natta Kalb logic tests passed');
