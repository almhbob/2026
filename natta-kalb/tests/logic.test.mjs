import assert from 'node:assert/strict';
import logic from '../src/game/logic.js';

const {
  createInitialBoard,
  countPieces,
  getMovesForPiece,
  getCaptureMovesForPiece,
  hasMoreCaptures,
  applyMove,
  updateDonkeyScores,
  PLAYERS,
} = logic;

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

const chainBoard = Array(25).fill(null);
chainBoard[20] = PLAYERS.A;
chainBoard[15] = PLAYERS.B;
chainBoard[5] = PLAYERS.B;
let firstChainMove = getCaptureMovesForPiece(chainBoard, 20, PLAYERS.A).find((move) => move.to === 10);
assert.equal(firstChainMove?.type, 'capture', 'first vertical capture should exist');
let chainResult = applyMove(chainBoard, firstChainMove, PLAYERS.A);
assert.equal(chainResult.ok, true, 'first chain capture should apply');
assert.equal(hasMoreCaptures(chainResult.board, 10, PLAYERS.A), true, 'same dog should have another capture');
let secondChainMove = getCaptureMovesForPiece(chainResult.board, 10, PLAYERS.A).find((move) => move.to === 0);
assert.equal(secondChainMove?.type, 'capture', 'second vertical capture should exist');
chainResult = applyMove(chainResult.board, secondChainMove, PLAYERS.A);
assert.equal(chainResult.board[0], PLAYERS.A, 'same dog should land after second capture');
assert.equal(chainResult.board[5], null, 'second captured dog should be removed');

let donkeys = { A: 0, B: 0 };
donkeys = updateDonkeyScores(donkeys, PLAYERS.A, PLAYERS.B);
assert.deepEqual(donkeys, { A: 0, B: 1 }, 'loser gets one donkey');
donkeys = updateDonkeyScores(donkeys, PLAYERS.B, PLAYERS.A);
assert.deepEqual(donkeys, { A: 0, B: 0 }, 'winner removes own donkey before adding to opponent');
donkeys = updateDonkeyScores(donkeys, PLAYERS.B, PLAYERS.A);
assert.deepEqual(donkeys, { A: 1, B: 0 }, 'after zero, next win gives donkey to opponent');

console.log('✅ Natta Kalb logic tests passed');
