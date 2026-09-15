import * as Haptics from 'expo-haptics';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_HEIGHT } from '@/components/CustomTabBar';
import AwardIcon from '../assets/icons/award.svg';
import BarChartIcon from '../assets/icons/bar-chart-2.svg';
import EyeOffIcon from '../assets/icons/eye-off.svg';
import EyeIcon from '../assets/icons/eye.svg';
import StarIcon from '../assets/icons/star.svg';
import BalanceTypeModal from '../components/BalanceTypeModal';
import CourtView from '../components/CourtView';
import TeamCard from '../components/TeamCard';
import useTheme from '../hooks/useTheme';
import { useGameStore } from '../stores/gameStore';
import { usePlayersStore } from '../stores/playersStore';
import { useThemeStore } from '../stores/themeStore';

export default function DrawScreen() {
  const [isBalanceModalVisible, setBalanceModalVisible] = useState(false);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [editingScore, setEditingScore] = useState<number | null>(null);
  const scoreUpdateInterval = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accelerationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const {
    teams,
    winnerIndex,
    setWinnerIndex,
    balanceMode,
    setBalanceMode,
    displayedBalanceMode,
    showCourtView,
    setShowCourtView,
    drawTeams,
    endMatchAndSubstitute,
    matchHistory,
    teamDisplayNames
  } = useGameStore();
  const { allPlayers, selectedPlayerIds } = usePlayersStore();
  const { darkMode } = useThemeStore();
  const theme = useTheme(darkMode);

  const sessionPlayers = useMemo(() => {
    return allPlayers.filter(p => selectedPlayerIds.has(p.id));
  }, [allPlayers, selectedPlayerIds]);
  
  const activePlayers = useMemo(() => {
      return sessionPlayers.filter(p => p.active);
  }, [sessionPlayers]);

  const handleDraw = () => {
    if (activePlayers.length < 2) {
      Alert.alert('Jogadores Insuficientes', 'Você precisa de pelo menos 2 jogadores ativos para sortear os times.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    drawTeams(sessionPlayers);
    setScores([0, 0]);
  };

  const handleScoreChange = (teamIndex: number, delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScores(currentScores => {
      const newScores = [...currentScores] as [number, number];
      newScores[teamIndex] = Math.max(0, newScores[teamIndex] + delta);
      return newScores;
    });
  };

  const handlePressIn = (teamIndex: number, delta: number) => {
    let currentDelay = 200;

    const updateScore = () => {
      handleScoreChange(teamIndex, delta);
      scoreUpdateInterval.current = setTimeout(updateScore, currentDelay);
    };

    const accelerate = () => {
      accelerationTimeout.current = setTimeout(() => {
        if (currentDelay > 50) {
          currentDelay = Math.max(50, currentDelay * 0.7);
        }
        accelerate();
      }, 1000);
    };

    handleScoreChange(teamIndex, delta); // Initial change
    scoreUpdateInterval.current = setTimeout(updateScore, 400); // Start after a delay
    accelerate();
  };

  const handlePressOut = () => {
    if (scoreUpdateInterval.current) {
      clearTimeout(scoreUpdateInterval.current);
    }
    if (accelerationTimeout.current) {
      clearTimeout(accelerationTimeout.current);
    }
  };

  const handleEndMatchAndSubstitute = () => {
    if (winnerIndex === null) {
      Alert.alert("Selecione um vencedor", "Marque o time vencedor para registrar a partida.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    endMatchAndSubstitute(scores);
    setScores([0, 0]);
  };
  
  const handleSelectWinner = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWinnerIndex(index === winnerIndex ? null : index);
  };

  const handleSelectBalanceMode = (mode: 'level' | 'winrate' | 'fundamentals') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBalanceMode(mode);
  };
  
  const renderBalanceIcon = () => {
    switch (balanceMode) {
      case 'level':
        return <BarChartIcon stroke={theme.text} width={22} height={22} />;
      case 'winrate':
        return <AwardIcon stroke={theme.text} width={22} height={22} />;
      case 'fundamentals':
        return <StarIcon stroke={theme.text} width={22} height={22} />;
      default:
        return <BarChartIcon stroke={theme.text} width={22} height={22} />;
    }
  };

  return (
     <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 8, paddingBottom: TAB_BAR_HEIGHT + insets.bottom }]}>
      <BalanceTypeModal
        visible={isBalanceModalVisible}
        darkMode={darkMode}
        players={activePlayers}
        onClose={() => setBalanceModalVisible(false)}
        onSelectMode={handleSelectBalanceMode}
      />

      <View style={{ flex: 1 }}>
        {teams.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.hint, { color: theme.placeholder, fontSize: 16 }]}>
              Clique em "Sortear Times" para começar.
            </Text>
          </View>
        ) : showCourtView ? (
          <CourtView
            teams={teams}
            darkMode={darkMode}
            winnerIndex={winnerIndex}
            onSelectWinner={handleSelectWinner}
            matchHistory={matchHistory}
          />
        ) : (
          <View>
            {teams.map((t, idx) => (
              <TeamCard
                key={idx}
                team={t}
                teamNumber={idx + 1}
                darkMode={darkMode}
                isWinner={idx === winnerIndex}
                onSelectWinner={() => handleSelectWinner(idx)}
                balanceMode={displayedBalanceMode}
                // New props for win probability
                opposingTeam={teams[idx === 0 ? 1 : 0]}
                matchHistory={matchHistory}
                showCourtView={showCourtView}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.drawFooter}>
        {teams.length > 0 && (
          <View style={styles.scoreContainer}>
            {/* Team 1 Score Control */}
            <View style={styles.teamScoreControl}>
              <View style={styles.teamLabelContainer}>
                <Text
                  style={[styles.teamLabel, { color: theme.text }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {(teamDisplayNames?.[0] || 'Time 1')}
                </Text>
              </View>
              <View style={[styles.scoreBox, { backgroundColor: '#2c3e50' }]}>
                <TouchableOpacity onPressIn={() => handlePressIn(0, -1)} onPressOut={handlePressOut} activeOpacity={1}>
                  <View style={[styles.scoreButtonContainer, { backgroundColor: theme.accentRed }]}>
                    <Text style={[styles.scoreButtonText, { color: theme.primaryText }]}>-</Text>
                  </View>
                </TouchableOpacity>
                {editingScore === 0 ? (
                  <TextInput
                    style={[styles.scoreText, { color: theme.text, paddingVertical: 0 }]}
                    value={scores[0].toString()}
                    onChangeText={(text) => {
                      const newScores = [...scores] as [number, number];
                      newScores[0] = parseInt(text, 10) || 0;
                      setScores(newScores);
                    }}
                    keyboardType="number-pad"
                    onBlur={() => setEditingScore(null)}
                    autoFocus
                  />
                ) : (
                  <TouchableOpacity onPress={() => setEditingScore(0)}>
                    <Text style={[styles.scoreText, { color: theme.text }]}>{scores[0]}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPressIn={() => handlePressIn(0, 1)} onPressOut={handlePressOut} activeOpacity={1}>
                  <View style={[styles.scoreButtonContainer, { backgroundColor: theme.accentGreen }]}>
                    <Text style={[styles.scoreButtonText, { color: theme.primaryText }]}>+</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.scoreDivider, { color: theme.text }]}>X</Text>

            {/* Team 2 Score Control */}
            <View style={styles.teamScoreControl}>
              <View style={styles.teamLabelContainer}>
                <Text
                  style={[styles.teamLabel, { color: theme.text }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {(teamDisplayNames?.[1] || 'Time 2')}
                </Text>
              </View>
              <View style={[styles.scoreBox, { backgroundColor: '#2c3e50' }]}>
                <TouchableOpacity onPressIn={() => handlePressIn(1, -1)} onPressOut={handlePressOut} activeOpacity={1}>
                  <View style={[styles.scoreButtonContainer, { backgroundColor: theme.accentRed }]}>
                    <Text style={[styles.scoreButtonText, { color: theme.primaryText }]}>-</Text>
                  </View>
                </TouchableOpacity>
                {editingScore === 1 ? (
                  <TextInput
                    style={[styles.scoreText, { color: theme.text, paddingVertical: 0 }]}
                    value={scores[1].toString()}
                    onChangeText={(text) => {
                      const newScores = [...scores] as [number, number];
                      newScores[1] = parseInt(text, 10) || 0;
                      setScores(newScores);
                    }}
                    keyboardType="number-pad"
                    onBlur={() => setEditingScore(null)}
                    autoFocus
                  />
                ) : (
                  <TouchableOpacity onPress={() => setEditingScore(1)}>
                    <Text style={[styles.scoreText, { color: theme.text }]}>{scores[1]}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPressIn={() => handlePressIn(1, 1)} onPressOut={handlePressOut} activeOpacity={1}>
                  <View style={[styles.scoreButtonContainer, { backgroundColor: theme.accentGreen }]}>
                    <Text style={[styles.scoreButtonText, { color: theme.primaryText }]}>+</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.toggleButton, { backgroundColor: theme.border }]}
            onPress={() => setBalanceModalVisible(true)}
          >
            {renderBalanceIcon()}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.drawButton,
              {
                backgroundColor: winnerIndex !== null ? theme.accentGreen : theme.primary,
                paddingVertical: 14,
              },
            ]}
            onPress={winnerIndex !== null ? handleEndMatchAndSubstitute : handleDraw}
          >
            <Text style={[styles.buttonText, { color: theme.primaryText }]}>
              {winnerIndex !== null
                ? 'Finalizar Partida'
                : teams.length > 0
                ? 'Sortear Novamente'
                : 'Sortear Times'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, { backgroundColor: theme.border }]}
            onPress={() => setShowCourtView(!showCourtView)}
          >
            {showCourtView ? (
              <EyeIcon stroke={theme.text} width={24} height={24} />
            ) : (
              <EyeOffIcon stroke={theme.text} width={24} height={24} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 4,
    textAlign: 'center'
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center'
  },
  toggleButton: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  drawButton: {
    flex: 3,
    borderRadius: 8,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  drawFooter: {
    paddingTop: 4,
    paddingBottom: 8
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  teamScoreControl: {
    alignItems: 'center',
    gap: 4,
    width: 160,
  },
  teamLabelContainer: {
    width: 120,
  },
  teamLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    overflow: 'hidden',
  },
  scoreButtonContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  scoreButton: {
  },
  scoreButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scoreText: {
    fontSize: 28,
    fontWeight: 'bold',
    minWidth: 50,
    textAlign: 'center',
  },
  scoreDivider: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 8,
    lineHeight: 42, // Align with score text
  },
});