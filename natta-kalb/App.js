import React, { useMemo, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, ScrollView, I18nManager } from 'react-native';

const {
  applyMove,
  countPieces,
  createInitialBoard,
  findMove,
  getAllMoves,
  getGameStatus,
  getMoveHintText,
  opponentOf,
  PLAYER_LABELS,
  PLAYERS,
} = require('./src/game/logic');

I18nManager.allowRTL(true);

const GOLD = '#F0B95B';
const IVORY = '#F8E9C7';
const DARK = '#15110B';
const CARD = 'rgba(255,255,255,0.08)';
const BORDER = 'rgba(255,255,255,0.16)';
const DANGER = '#F26464';
const SUCCESS = '#A9F0A6';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [board, setBoard] = useState(createInitialBoard());
  const [currentPlayer, setCurrentPlayer] = useState(PLAYERS.A);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [forcedCapture, setForcedCapture] = useState(false);
  const [lastMove, setLastMove] = useState(null);

  const pieces = useMemo(() => countPieces(board), [board]);
  const gameStatus = useMemo(() => getGameStatus(board, currentPlayer, { forcedCapture }), [board, currentPlayer, forcedCapture]);
  const selectedMoves = useMemo(() => {
    if (selected === null) return [];
    return getAllMoves(board, currentPlayer, { forcedCapture }).filter((move) => move.from === selected);
  }, [board, currentPlayer, selected, forcedCapture]);
  const availableTargets = useMemo(() => new Map(selectedMoves.map((move) => [move.to, move])), [selectedMoves]);

  function resetGame() {
    setBoard(createInitialBoard());
    setCurrentPlayer(PLAYERS.A);
    setSelected(null);
    setHistory([]);
    setLastMove(null);
    setScreen('game');
  }

  function undo() {
    const previous = history[history.length - 1];
    if (!previous) return;
    setBoard(previous.board);
    setCurrentPlayer(previous.currentPlayer);
    setSelected(null);
    setLastMove(previous.lastMove);
    setHistory((items) => items.slice(0, -1));
  }

  function onCellPress(index) {
    if (gameStatus.ended) return;
    const cell = board[index];

    if (cell === currentPlayer) {
      const moves = getAllMoves(board, currentPlayer, { forcedCapture }).filter((move) => move.from === index);
      setSelected(moves.length > 0 ? index : null);
      return;
    }

    if (selected !== null && availableTargets.has(index)) {
      const move = findMove(board, currentPlayer, selected, index);
      if (!move) return;
      const legalUnderMode = getAllMoves(board, currentPlayer, { forcedCapture }).some((candidate) => candidate.from === move.from && candidate.to === move.to);
      if (!legalUnderMode) return;
      const result = applyMove(board, move, currentPlayer);
      if (!result.ok) return;
      setHistory((items) => [...items, { board, currentPlayer, lastMove }]);
      setBoard(result.board);
      setLastMove(move);
      setSelected(null);
      setCurrentPlayer(opponentOf(currentPlayer));
      return;
    }
    setSelected(null);
  }

  if (screen === 'rules') return <RulesScreen onBack={() => setScreen('home')} onStart={resetGame} />;
  if (screen === 'game') {
    return (
      <GameScreen
        board={board}
        pieces={pieces}
        selected={selected}
        currentPlayer={currentPlayer}
        availableTargets={availableTargets}
        onCellPress={onCellPress}
        resetGame={resetGame}
        undo={undo}
        canUndo={history.length > 0}
        forcedCapture={forcedCapture}
        setForcedCapture={setForcedCapture}
        gameStatus={gameStatus}
        lastMove={lastMove}
        onHome={() => setScreen('home')}
      />
    );
  }
  return <HomeScreen onStart={resetGame} onRules={() => setScreen('rules')} />;
}

function HomeScreen({ onStart, onRules }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={DARK} />
      <View style={styles.heroWrap}>
        <View style={styles.glow} />
        <Text style={styles.badge}>لعبة سودانية تراثية</Text>
        <Text style={styles.title}>نطة كلب</Text>
        <Text style={styles.subtitle}>Natta Kalb</Text>
        <Text style={styles.heroText}>ذكاء سوداني في قفزة واحدة. حرّك كلبك، اقفز فوق كلب الخصم، واتركه خارج اللوحة.</Text>
        <View style={styles.homeStatsRow}>
          <MiniStat label="لوحة" value="5×5" />
          <MiniStat label="لكل لاعب" value="12" />
          <MiniStat label="الاتجاه" value="رأسي/أفقي" />
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={onStart}><Text style={styles.primaryButtonText}>ابدأ المباراة</Text></TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onRules}><Text style={styles.secondaryButtonText}>اعرف القواعد</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function RulesScreen({ onBack, onStart }) {
  const rules = [
    'اللوحة خمسة صفوف وخمسة أعمدة، وفي البداية توجد خانة واحدة فارغة.',
    'لكل لاعب 12 كلبًا، ويتحرك الكلب إلى خانة مجاورة فارغة.',
    'يموت كلب الخصم إذا قفزت فوقه إلى مربع خالٍ خلفه.',
    'القفز مسموح أفقيًا أو رأسيًا فقط، ولا توجد قفزة قطرية.',
    'الفوز عندما تُنهي كلاب الخصم أو تمنعه من الحركة.',
  ];
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.rulesWrap}>
        <Text style={styles.screenTitle}>القواعد</Text>
        {rules.map((rule, index) => (
          <View style={styles.ruleCard} key={rule}>
            <Text style={styles.ruleNumber}>{index + 1}</Text>
            <Text style={styles.ruleText}>{rule}</Text>
          </View>
        ))}
        <TouchableOpacity style={styles.primaryButton} onPress={onStart}><Text style={styles.primaryButtonText}>ابدأ اللعب</Text></TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBack}><Text style={styles.secondaryButtonText}>رجوع</Text></TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function GameScreen({ board, pieces, selected, currentPlayer, availableTargets, onCellPress, resetGame, undo, canUndo, forcedCapture, setForcedCapture, gameStatus, lastMove, onHome }) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 32, 380);
  const cellSize = boardSize / 5;
  const currentMoves = getAllMoves(board, currentPlayer, { forcedCapture });
  const hasCapture = currentMoves.some((move) => move.type === 'capture');
  const message = gameStatus.ended ? `الفائز: ${PLAYER_LABELS[gameStatus.winner]}` : hasCapture ? 'توجد قفزة قاتلة متاحة' : `الدور على ${PLAYER_LABELS[currentPlayer]}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={DARK} />
      <View style={styles.gameWrap}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onHome} style={styles.smallButton}><Text style={styles.smallButtonText}>الرئيسية</Text></TouchableOpacity>
          <View style={styles.turnCard}><Text style={styles.turnLabel}>الدور الآن</Text><Text style={styles.turnValue}>{PLAYER_LABELS[currentPlayer]}</Text></View>
          <TouchableOpacity onPress={resetGame} style={styles.smallButton}><Text style={styles.smallButtonText}>إعادة</Text></TouchableOpacity>
        </View>
        <View style={styles.scoreRow}>
          <ScoreCard title="الذهبي" count={pieces.A} active={currentPlayer === PLAYERS.A} tone="gold" />
          <ScoreCard title="العاجي" count={pieces.B} active={currentPlayer === PLAYERS.B} tone="ivory" />
        </View>
        <View style={styles.messageCard}><Text style={styles.messageText}>{message}</Text><Text style={styles.messageSubText}>{lastMove ? getMoveHintText(lastMove) : 'اختر كلبًا لعرض الحركات المتاحة'}</Text></View>
        <View style={[styles.board, { width: boardSize, height: boardSize }]}> 
          {board.map((cell, index) => {
            const targetMove = availableTargets.get(index);
            const isTarget = Boolean(targetMove);
            const isCaptureTarget = targetMove?.type === 'capture';
            const isSelected = selected === index;
            return (
              <TouchableOpacity key={index} activeOpacity={0.8} onPress={() => onCellPress(index)} style={[styles.cell, { width: cellSize, height: cellSize }, (index + Math.floor(index / 5)) % 2 === 0 ? styles.cellA : styles.cellB, isSelected && styles.selectedCell, isTarget && styles.targetCell, isCaptureTarget && styles.captureTarget]}>
                {isTarget && <View style={[styles.targetDot, isCaptureTarget && styles.captureDot]} />}
                {cell && <DogPiece player={cell} active={cell === currentPlayer} />}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.controlsRow}>
          <TouchableOpacity style={[styles.controlButton, !canUndo && styles.disabledButton]} onPress={undo} disabled={!canUndo}><Text style={styles.controlButtonText}>تراجع</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, forcedCapture && styles.activeModeButton]} onPress={() => setForcedCapture(!forcedCapture)}><Text style={styles.controlButtonText}>{forcedCapture ? 'الأكل إجباري' : 'الأكل اختياري'}</Text></TouchableOpacity>
        </View>
        {gameStatus.ended && <View style={styles.winnerOverlay}><Text style={styles.winnerTitle}>انتهت المباراة</Text><Text style={styles.winnerText}>فاز اللاعب {PLAYER_LABELS[gameStatus.winner]}</Text><TouchableOpacity style={styles.primaryButton} onPress={resetGame}><Text style={styles.primaryButtonText}>مباراة جديدة</Text></TouchableOpacity></View>}
      </View>
    </SafeAreaView>
  );
}

function DogPiece({ player, active }) {
  const isA = player === PLAYERS.A;
  return <View style={[styles.piece, isA ? styles.pieceGold : styles.pieceIvory, active && styles.activePiece]}><Text style={styles.pieceText}>🐕</Text></View>;
}

function ScoreCard({ title, count, active, tone }) {
  return <View style={[styles.scoreCard, active && styles.activeScoreCard]}><Text style={styles.scoreTitle}>{title}</Text><Text style={[styles.scoreCount, tone === 'gold' ? styles.goldText : styles.ivoryText]}>{count}</Text><Text style={styles.scoreMeta}>كلب متبقي</Text></View>;
}

function MiniStat({ label, value }) {
  return <View style={styles.miniStat}><Text style={styles.miniStatValue}>{value}</Text><Text style={styles.miniStatLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: DARK },
  heroWrap: { flex: 1, padding: 22, justifyContent: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(240,185,91,0.18)', top: 80, right: -70 },
  badge: { alignSelf: 'flex-start', color: IVORY, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, marginBottom: 18, fontWeight: '800' },
  title: { color: GOLD, fontSize: 58, fontWeight: '900', textAlign: 'left' },
  subtitle: { color: IVORY, fontSize: 22, fontWeight: '800' },
  heroText: { color: 'rgba(248,233,199,0.78)', fontSize: 17, lineHeight: 29, marginTop: 18, maxWidth: 340 },
  homeStatsRow: { flexDirection: 'row', gap: 10, marginVertical: 26 },
  miniStat: { flex: 1, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 18, paddingVertical: 14, alignItems: 'center' },
  miniStatValue: { color: GOLD, fontWeight: '900', fontSize: 19 },
  miniStatLabel: { color: 'rgba(248,233,199,0.64)', fontSize: 11, marginTop: 4 },
  primaryButton: { backgroundColor: GOLD, borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  primaryButtonText: { color: '#221609', fontSize: 17, fontWeight: '900' },
  secondaryButton: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 18, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
  secondaryButtonText: { color: IVORY, fontSize: 16, fontWeight: '800' },
  rulesWrap: { padding: 20, paddingBottom: 40 },
  screenTitle: { color: GOLD, fontSize: 38, fontWeight: '900', marginTop: 10, marginBottom: 18 },
  ruleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 16, marginBottom: 12, gap: 12 },
  ruleNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(240,185,91,0.18)', color: GOLD, textAlign: 'center', lineHeight: 34, fontWeight: '900' },
  ruleText: { flex: 1, color: IVORY, fontSize: 15, lineHeight: 24 },
  gameWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 8, alignItems: 'center' },
  topBar: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  smallButton: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14 },
  smallButtonText: { color: IVORY, fontWeight: '800', fontSize: 12 },
  turnCard: { alignItems: 'center' },
  turnLabel: { color: 'rgba(248,233,199,0.56)', fontSize: 12 },
  turnValue: { color: GOLD, fontSize: 18, fontWeight: '900' },
  scoreRow: { flexDirection: 'row', width: '100%', gap: 10, marginBottom: 10 },
  scoreCard: { flex: 1, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 18, padding: 12 },
  activeScoreCard: { borderColor: GOLD, backgroundColor: 'rgba(240,185,91,0.12)' },
  scoreTitle: { color: IVORY, fontSize: 13, fontWeight: '800' },
  scoreCount: { fontSize: 28, fontWeight: '900', marginTop: 2 },
  scoreMeta: { color: 'rgba(248,233,199,0.55)', fontSize: 11 },
  goldText: { color: GOLD }, ivoryText: { color: IVORY },
  messageCard: { width: '100%', backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 18, padding: 13, marginBottom: 14 },
  messageText: { color: IVORY, fontWeight: '900', fontSize: 15, textAlign: 'center' },
  messageSubText: { color: 'rgba(248,233,199,0.58)', fontSize: 12, marginTop: 4, textAlign: 'center' },
  board: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 26, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(240,185,91,0.45)', backgroundColor: '#2D1F12' },
  cell: { alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
  cellA: { backgroundColor: '#8E5A2A' }, cellB: { backgroundColor: '#5C371D' },
  selectedCell: { backgroundColor: '#A46C34' }, targetCell: { backgroundColor: '#6C7F3A' }, captureTarget: { backgroundColor: '#883C32' },
  targetDot: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: SUCCESS, opacity: 0.9 },
  captureDot: { backgroundColor: DANGER },
  piece: { width: '72%', height: '72%', borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  pieceGold: { backgroundColor: GOLD, borderColor: '#FFE1A4' }, pieceIvory: { backgroundColor: IVORY, borderColor: '#FFFFFF' },
  activePiece: { transform: [{ scale: 1.04 }] }, pieceText: { fontSize: 22 },
  controlsRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 15 },
  controlButton: { flex: 1, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 16, paddingVertical: 13, alignItems: 'center' },
  activeModeButton: { borderColor: GOLD, backgroundColor: 'rgba(240,185,91,0.14)' }, disabledButton: { opacity: 0.4 },
  controlButtonText: { color: IVORY, fontWeight: '900', fontSize: 13 },
  winnerOverlay: { position: 'absolute', left: 16, right: 16, bottom: 22, backgroundColor: 'rgba(21,17,11,0.96)', borderWidth: 1, borderColor: 'rgba(240,185,91,0.45)', borderRadius: 24, padding: 18 },
  winnerTitle: { color: GOLD, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  winnerText: { color: IVORY, fontSize: 16, fontWeight: '800', textAlign: 'center', marginTop: 6 },
});
