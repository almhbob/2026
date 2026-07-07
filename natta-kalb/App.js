import React, { useEffect, useMemo, useState } from 'react';
import { I18nManager, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, Vibration, View, useWindowDimensions } from 'react-native';
import * as Speech from 'expo-speech';

const {
  applyMove,
  countPieces,
  createInitialBoard,
  findMove,
  getAllMoves,
  getCaptureMovesForPiece,
  getGameStatus,
  getMoveHintText,
  hasMoreCaptures,
  opponentOf,
  PLAYER_LABELS,
  PLAYERS,
  updateDonkeyScores,
} = require('./src/game/logic');

I18nManager.allowRTL(true);

const COLORS = {
  dark: '#15110B',
  card: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.16)',
  gold: '#F0B95B',
  ivory: '#F8E9C7',
  red: '#F26464',
  green: '#A9F0A6',
};

export default function App() {
  const [screen, setScreen] = useState('home');
  const [board, setBoard] = useState(createInitialBoard());
  const [currentPlayer, setCurrentPlayer] = useState(PLAYERS.A);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [forcedCapture, setForcedCapture] = useState(false);
  const [lastMove, setLastMove] = useState(null);
  const [chainCaptureFrom, setChainCaptureFrom] = useState(null);
  const [donkeyScores, setDonkeyScores] = useState({ A: 0, B: 0 });
  const [matchResultApplied, setMatchResultApplied] = useState(false);
  const [defeatPopup, setDefeatPopup] = useState(null);

  const pieces = useMemo(() => countPieces(board), [board]);
  const gameStatus = useMemo(() => getGameStatus(board, currentPlayer, { forcedCapture }), [board, currentPlayer, forcedCapture]);
  const selectedMoves = useMemo(() => {
    if (chainCaptureFrom !== null) return getCaptureMovesForPiece(board, chainCaptureFrom, currentPlayer);
    if (selected === null) return [];
    return getAllMoves(board, currentPlayer, { forcedCapture }).filter((move) => move.from === selected);
  }, [board, chainCaptureFrom, currentPlayer, forcedCapture, selected]);
  const availableTargets = useMemo(() => new Map(selectedMoves.map((move) => [move.to, move])), [selectedMoves]);

  useEffect(() => {
    if (!gameStatus.ended || matchResultApplied || !gameStatus.winner) return;
    const winner = gameStatus.winner;
    const loser = opponentOf(winner);
    setDonkeyScores((scores) => updateDonkeyScores(scores, winner, loser));
    setDefeatPopup({ winner, loser });
    setMatchResultApplied(true);
    playDonkeyDefeatSound(loser);
  }, [gameStatus, matchResultApplied]);

  function playDonkeyDefeatSound(loser) {
    Vibration.vibrate([0, 160, 80, 220, 90, 260]);
    try {
      Speech.stop();
      Speech.speak(`إيهاه إيهاه! ${PLAYER_LABELS[loser]} عليه حمار`, {
        language: 'ar',
        rate: 0.78,
        pitch: 0.55,
        volume: 1,
      });
    } catch (error) {}
  }

  function resetGame() {
    Speech.stop();
    setBoard(createInitialBoard());
    setCurrentPlayer(PLAYERS.A);
    setSelected(null);
    setHistory([]);
    setLastMove(null);
    setChainCaptureFrom(null);
    setMatchResultApplied(false);
    setDefeatPopup(null);
    setScreen('game');
  }

  function undo() {
    const previous = history[history.length - 1];
    if (!previous || gameStatus.ended) return;
    setBoard(previous.board);
    setCurrentPlayer(previous.currentPlayer);
    setSelected(previous.selected);
    setLastMove(previous.lastMove);
    setChainCaptureFrom(previous.chainCaptureFrom);
    setHistory((items) => items.slice(0, -1));
  }

  function applySelectedMove(targetIndex, chainOnly = false) {
    const from = chainOnly ? chainCaptureFrom : selected;
    const move = findMove(board, currentPlayer, from, targetIndex, chainOnly ? { onlyCaptures: true } : {});
    if (!move) return;

    const legalMoves = chainOnly ? getCaptureMovesForPiece(board, chainCaptureFrom, currentPlayer) : getAllMoves(board, currentPlayer, { forcedCapture });
    const legal = legalMoves.some((candidate) => candidate.from === move.from && candidate.to === move.to && candidate.type === move.type);
    if (!legal) return;

    const result = applyMove(board, move, currentPlayer);
    if (!result.ok) return;

    setHistory((items) => [...items, { board, currentPlayer, selected, lastMove, chainCaptureFrom }]);
    setBoard(result.board);
    setLastMove(move);

    if (move.type === 'capture' && hasMoreCaptures(result.board, move.to, currentPlayer)) {
      setSelected(move.to);
      setChainCaptureFrom(move.to);
      return;
    }

    setSelected(null);
    setChainCaptureFrom(null);
    setCurrentPlayer(opponentOf(currentPlayer));
  }

  function onCellPress(index) {
    if (gameStatus.ended) return;

    if (chainCaptureFrom !== null) {
      if (index === chainCaptureFrom) return setSelected(chainCaptureFrom);
      if (availableTargets.has(index)) applySelectedMove(index, true);
      return;
    }

    if (board[index] === currentPlayer) {
      const moves = getAllMoves(board, currentPlayer, { forcedCapture }).filter((move) => move.from === index);
      setSelected(moves.length > 0 ? index : null);
      return;
    }

    if (selected !== null && availableTargets.has(index)) applySelectedMove(index, false);
    else setSelected(null);
  }

  if (screen === 'rules') return <RulesScreen onBack={() => setScreen('home')} onStart={resetGame} />;
  if (screen === 'game') {
    return (
      <GameScreen
        board={board}
        pieces={pieces}
        selected={chainCaptureFrom ?? selected}
        currentPlayer={currentPlayer}
        availableTargets={availableTargets}
        onCellPress={onCellPress}
        resetGame={resetGame}
        resetDonkeys={() => setDonkeyScores({ A: 0, B: 0 })}
        undo={undo}
        canUndo={history.length > 0 && !gameStatus.ended}
        forcedCapture={forcedCapture}
        setForcedCapture={setForcedCapture}
        gameStatus={gameStatus}
        lastMove={lastMove}
        chainCaptureFrom={chainCaptureFrom}
        donkeyScores={donkeyScores}
        defeatPopup={defeatPopup}
        closeDefeatPopup={() => setDefeatPopup(null)}
        onHome={() => setScreen('home')}
      />
    );
  }
  return <HomeScreen onStart={resetGame} onRules={() => setScreen('rules')} donkeyScores={donkeyScores} resetDonkeys={() => setDonkeyScores({ A: 0, B: 0 })} />;
}

function HomeScreen({ onStart, onRules, donkeyScores, resetDonkeys }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />
      <View style={styles.heroWrap}>
        <Text style={styles.badge}>لعبة سودانية تراثية</Text>
        <Text style={styles.title}>نطة كلب</Text>
        <Text style={styles.subtitle}>Natta Kalb</Text>
        <Text style={styles.heroText}>ذكاء سوداني في قفزة واحدة. الآن مع الأكل المتتالي وسجل الحمير.</Text>
        <View style={styles.homeStatsRow}>
          <MiniStat label="لوحة" value="5×5" />
          <MiniStat label="لكل لاعب" value="12" />
          <MiniStat label="السلسلة" value="متتالية" />
        </View>
        <DonkeyScoreBoard donkeyScores={donkeyScores} />
        <TouchableOpacity style={styles.primaryButton} onPress={onStart}><Text style={styles.primaryButtonText}>ابدأ المباراة</Text></TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onRules}><Text style={styles.secondaryButtonText}>اعرف القواعد</Text></TouchableOpacity>
        <TouchableOpacity style={styles.ghostButton} onPress={resetDonkeys}><Text style={styles.ghostButtonText}>تصفير الحمير</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function RulesScreen({ onBack, onStart }) {
  const rules = [
    'اللوحة خمسة صفوف وخمسة أعمدة، وفي البداية توجد خانة واحدة فارغة.',
    'لكل لاعب 12 كلبًا، ويتحرك الكلب إلى خانة مجاورة فارغة.',
    'يموت كلب الخصم إذا قفزت فوقه إلى مربع خالٍ خلفه.',
    'إذا أكل الكلب ووجد أمامه أكلًا آخر، يستمر بنفس الكلب في سلسلة متتالية.',
    'الهزيمة تُحسب حمارًا على الخاسر؛ وإذا فاز من عليه حمير تُخصم منه أولًا حتى تصير صفرًا، ثم تنتقل الحمير إلى الخصم.',
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

function GameScreen(props) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 32, 380);
  const cellSize = boardSize / 5;
  const currentMoves = props.chainCaptureFrom !== null ? getCaptureMovesForPiece(props.board, props.chainCaptureFrom, props.currentPlayer) : getAllMoves(props.board, props.currentPlayer, { forcedCapture: props.forcedCapture });
  const hasCapture = currentMoves.some((move) => move.type === 'capture');
  const message = props.gameStatus.ended
    ? `الفائز: ${PLAYER_LABELS[props.gameStatus.winner]}`
    : props.chainCaptureFrom !== null
      ? 'سلسلة أكل مستمرة — أكمل بنفس الكلب'
      : hasCapture ? 'توجد قفزة قاتلة متاحة' : `الدور على ${PLAYER_LABELS[props.currentPlayer]}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />
      <View style={styles.gameWrap}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={props.onHome} style={styles.smallButton}><Text style={styles.smallButtonText}>الرئيسية</Text></TouchableOpacity>
          <View style={styles.turnCard}><Text style={styles.turnLabel}>الدور الآن</Text><Text style={styles.turnValue}>{PLAYER_LABELS[props.currentPlayer]}</Text></View>
          <TouchableOpacity onPress={props.resetGame} style={styles.smallButton}><Text style={styles.smallButtonText}>إعادة</Text></TouchableOpacity>
        </View>

        <View style={styles.scoreRow}>
          <ScoreCard title="الذهبي" count={props.pieces.A} donkeyCount={props.donkeyScores.A} active={props.currentPlayer === PLAYERS.A} tone="gold" />
          <ScoreCard title="العاجي" count={props.pieces.B} donkeyCount={props.donkeyScores.B} active={props.currentPlayer === PLAYERS.B} tone="ivory" />
        </View>
        <DonkeyScoreBoard donkeyScores={props.donkeyScores} />
        <View style={[styles.messageCard, props.chainCaptureFrom !== null && styles.chainCard]}>
          <Text style={styles.messageText}>{message}</Text>
          <Text style={styles.messageSubText}>{props.lastMove ? getMoveHintText(props.lastMove) : 'اختر كلبًا لعرض الحركات المتاحة'}</Text>
        </View>

        <View style={[styles.board, { width: boardSize, height: boardSize }]}>
          {props.board.map((cell, index) => {
            const targetMove = props.availableTargets.get(index);
            const isTarget = Boolean(targetMove);
            const isCaptureTarget = targetMove?.type === 'capture';
            const isSelected = props.selected === index;
            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                onPress={() => props.onCellPress(index)}
                style={[styles.cell, { width: cellSize, height: cellSize }, (index + Math.floor(index / 5)) % 2 === 0 ? styles.cellA : styles.cellB, isSelected && styles.selectedCell, isTarget && styles.targetCell, isCaptureTarget && styles.captureTarget]}
              >
                {isTarget && <View style={[styles.targetDot, isCaptureTarget && styles.captureDot]} />}
                {cell && <DogPiece player={cell} active={cell === props.currentPlayer} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity style={[styles.controlButton, !props.canUndo && styles.disabledButton]} onPress={props.undo} disabled={!props.canUndo}><Text style={styles.controlButtonText}>تراجع</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, props.forcedCapture && styles.activeModeButton]} onPress={() => props.setForcedCapture(!props.forcedCapture)}><Text style={styles.controlButtonText}>{props.forcedCapture ? 'الأكل إجباري' : 'الأكل اختياري'}</Text></TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.ghostButton} onPress={props.resetDonkeys}><Text style={styles.ghostButtonText}>تصفير حمير الجلسة</Text></TouchableOpacity>

        {props.gameStatus.ended && <WinnerCard winner={props.gameStatus.winner} resetGame={props.resetGame} />}
        {props.defeatPopup && <DonkeyDefeatModal result={props.defeatPopup} onClose={props.closeDefeatPopup} />}
      </View>
    </SafeAreaView>
  );
}

function WinnerCard({ winner, resetGame }) {
  return (
    <View style={styles.winnerOverlay}>
      <Text style={styles.winnerTitle}>انتهت المباراة</Text>
      <Text style={styles.winnerText}>فاز اللاعب {PLAYER_LABELS[winner]}</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={resetGame}><Text style={styles.primaryButtonText}>مباراة جديدة</Text></TouchableOpacity>
    </View>
  );
}

function DonkeyDefeatModal({ result, onClose }) {
  return (
    <View style={styles.defeatBackdrop}>
      <View style={styles.defeatCard}>
        <View style={styles.donkeyImage}><Text style={styles.donkeyEmoji}>🫏</Text></View>
        <Text style={styles.defeatTitle}>عليه حمار!</Text>
        <Text style={styles.defeatText}>اللاعب المهزوم: {PLAYER_LABELS[result.loser]}</Text>
        <Text style={styles.defeatJoke}>إيهاه إيهاه… القفزة كانت موجعة 😂</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={onClose}><Text style={styles.primaryButtonText}>ضحكنا… واصل</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function DonkeyScoreBoard({ donkeyScores }) {
  return (
    <View style={styles.donkeyBoard}>
      <Text style={styles.donkeyBoardTitle}>سجل الحمير 🫏</Text>
      <View style={styles.donkeyBoardRow}>
        <Text style={styles.donkeyBoardText}>الذهبي: {donkeyScores.A}</Text>
        <Text style={styles.donkeyBoardText}>العاجي: {donkeyScores.B}</Text>
      </View>
    </View>
  );
}

function DogPiece({ player, active }) {
  const isA = player === PLAYERS.A;
  return <View style={[styles.piece, isA ? styles.pieceGold : styles.pieceIvory, active && styles.activePiece]}><Text style={styles.pieceText}>🐕</Text></View>;
}

function ScoreCard({ title, count, donkeyCount, active, tone }) {
  return <View style={[styles.scoreCard, active && styles.activeScoreCard]}><Text style={styles.scoreTitle}>{title}</Text><Text style={[styles.scoreCount, tone === 'gold' ? styles.goldText : styles.ivoryText]}>{count}</Text><Text style={styles.scoreMeta}>كلب متبقي</Text><Text style={styles.donkeyMini}>حمير: {donkeyCount}</Text></View>;
}

function MiniStat({ label, value }) {
  return <View style={styles.miniStat}><Text style={styles.miniStatValue}>{value}</Text><Text style={styles.miniStatLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.dark },
  heroWrap: { flex: 1, padding: 22, justifyContent: 'center' },
  badge: { alignSelf: 'flex-start', color: COLORS.ivory, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, marginBottom: 18, fontWeight: '800' },
  title: { color: COLORS.gold, fontSize: 58, fontWeight: '900', textAlign: 'left' },
  subtitle: { color: COLORS.ivory, fontSize: 22, fontWeight: '800' },
  heroText: { color: 'rgba(248,233,199,0.78)', fontSize: 17, lineHeight: 29, marginTop: 18 },
  homeStatsRow: { flexDirection: 'row', gap: 10, marginVertical: 18 },
  miniStat: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, paddingVertical: 14, alignItems: 'center' },
  miniStatValue: { color: COLORS.gold, fontWeight: '900', fontSize: 17 },
  miniStatLabel: { color: 'rgba(248,233,199,0.64)', fontSize: 11, marginTop: 4 },
  primaryButton: { backgroundColor: COLORS.gold, borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  primaryButtonText: { color: '#221609', fontSize: 17, fontWeight: '900' },
  secondaryButton: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
  secondaryButtonText: { color: COLORS.ivory, fontSize: 16, fontWeight: '800' },
  ghostButton: { paddingVertical: 11, alignItems: 'center', marginTop: 6 },
  ghostButtonText: { color: 'rgba(248,233,199,0.58)', fontWeight: '800' },
  rulesWrap: { padding: 20, paddingBottom: 40 },
  screenTitle: { color: COLORS.gold, fontSize: 38, fontWeight: '900', marginTop: 10, marginBottom: 18 },
  ruleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 16, marginBottom: 12, gap: 12 },
  ruleNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(240,185,91,0.18)', color: COLORS.gold, textAlign: 'center', lineHeight: 34, fontWeight: '900' },
  ruleText: { flex: 1, color: COLORS.ivory, fontSize: 15, lineHeight: 24 },
  gameWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 8, alignItems: 'center' },
  topBar: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  smallButton: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14 },
  smallButtonText: { color: COLORS.ivory, fontWeight: '800', fontSize: 12 },
  turnCard: { alignItems: 'center' },
  turnLabel: { color: 'rgba(248,233,199,0.56)', fontSize: 12 },
  turnValue: { color: COLORS.gold, fontSize: 18, fontWeight: '900' },
  scoreRow: { flexDirection: 'row', width: '100%', gap: 10, marginBottom: 8 },
  scoreCard: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 12 },
  activeScoreCard: { borderColor: COLORS.gold, backgroundColor: 'rgba(240,185,91,0.12)' },
  scoreTitle: { color: COLORS.ivory, fontSize: 13, fontWeight: '800' },
  scoreCount: { fontSize: 28, fontWeight: '900', marginTop: 2 },
  scoreMeta: { color: 'rgba(248,233,199,0.55)', fontSize: 11 },
  donkeyMini: { color: 'rgba(248,233,199,0.82)', marginTop: 6, fontWeight: '900' },
  goldText: { color: COLORS.gold },
  ivoryText: { color: COLORS.ivory },
  donkeyBoard: { width: '100%', backgroundColor: 'rgba(242,100,100,0.10)', borderColor: 'rgba(242,100,100,0.30)', borderWidth: 1, borderRadius: 16, padding: 10, marginBottom: 8 },
  donkeyBoardTitle: { color: COLORS.ivory, textAlign: 'center', fontWeight: '900', marginBottom: 4 },
  donkeyBoardRow: { flexDirection: 'row', justifyContent: 'space-around' },
  donkeyBoardText: { color: COLORS.gold, fontWeight: '900' },
  messageCard: { width: '100%', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 13, marginBottom: 14 },
  chainCard: { borderColor: COLORS.green, backgroundColor: 'rgba(169,240,166,0.10)' },
  messageText: { color: COLORS.ivory, fontWeight: '900', fontSize: 15, textAlign: 'center' },
  messageSubText: { color: 'rgba(248,233,199,0.58)', fontSize: 12, marginTop: 4, textAlign: 'center' },
  board: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 26, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(240,185,91,0.45)', backgroundColor: '#2D1F12' },
  cell: { alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
  cellA: { backgroundColor: '#8E5A2A' },
  cellB: { backgroundColor: '#5C371D' },
  selectedCell: { backgroundColor: '#A46C34' },
  targetCell: { backgroundColor: '#6C7F3A' },
  captureTarget: { backgroundColor: '#883C32' },
  targetDot: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.green, opacity: 0.9 },
  captureDot: { backgroundColor: COLORS.red },
  piece: { width: '72%', height: '72%', borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  pieceGold: { backgroundColor: COLORS.gold, borderColor: '#FFE1A4' },
  pieceIvory: { backgroundColor: COLORS.ivory, borderColor: '#FFFFFF' },
  activePiece: { transform: [{ scale: 1.04 }] },
  pieceText: { fontSize: 22 },
  controlsRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 15 },
  controlButton: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingVertical: 13, alignItems: 'center' },
  activeModeButton: { borderColor: COLORS.gold, backgroundColor: 'rgba(240,185,91,0.14)' },
  disabledButton: { opacity: 0.4 },
  controlButtonText: { color: COLORS.ivory, fontWeight: '900', fontSize: 13 },
  winnerOverlay: { position: 'absolute', left: 16, right: 16, bottom: 22, backgroundColor: 'rgba(21,17,11,0.96)', borderWidth: 1, borderColor: 'rgba(240,185,91,0.45)', borderRadius: 24, padding: 18 },
  winnerTitle: { color: COLORS.gold, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  winnerText: { color: COLORS.ivory, fontSize: 16, fontWeight: '800', textAlign: 'center', marginTop: 6 },
  defeatBackdrop: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.68)', justifyContent: 'center', alignItems: 'center', padding: 18 },
  defeatCard: { width: '100%', backgroundColor: '#20150d', borderColor: 'rgba(240,185,91,0.50)', borderWidth: 1.5, borderRadius: 28, padding: 22, alignItems: 'center' },
  donkeyImage: { width: 150, height: 150, marginBottom: 8, borderRadius: 40, backgroundColor: 'rgba(240,185,91,0.14)', alignItems: 'center', justifyContent: 'center' },
  donkeyEmoji: { fontSize: 96 },
  defeatTitle: { color: COLORS.gold, fontSize: 34, fontWeight: '900' },
  defeatText: { color: COLORS.ivory, fontSize: 17, fontWeight: '900', marginTop: 8 },
  defeatJoke: { color: 'rgba(248,233,199,0.70)', textAlign: 'center', fontSize: 15, lineHeight: 24, marginTop: 8 },
});
