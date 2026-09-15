// components/MatchDetailCard.tsx (versão definitiva com Reanimated + medição de layout)

import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import useTheme from '../hooks/useTheme';
import { Match } from '../types';

interface MatchDetailCardProps {
  match: Match;
  matchNumber: number;
  darkMode: boolean;
  onDelete: (matchId: string) => void;
  animationSpeed?: number;
}

const MatchDetailCard: React.FC<MatchDetailCardProps> = ({
  match,
  matchNumber,
  darkMode,
  onDelete,
  animationSpeed = 300,
}) => {
  const theme = useTheme(darkMode);
  const [isExpanded, setIsExpanded] = useState(false);
  // 1. Estado para guardar a altura medida do conteúdo
  const [contentHeight, setContentHeight] = useState(0);

  const progress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    // 2. Interpolar o progresso da animação (0 a 1) para a altura (0 a contentHeight)
    const height = interpolate(
      progress.value,
      [0, 1],
      [0, contentHeight]
    );
    return {
      height: height,
      opacity: progress.value, // Anima a opacidade junto com a altura
    };
  });

  const toggleExpand = () => {
    // 3. A animação é disparada ao mudar o valor do 'progress'
    // eslint-disable-next-line react-hooks/immutability
    progress.value = withTiming(isExpanded ? 0 : 1, { duration: animationSpeed });
    setIsExpanded(!isExpanded);
  };

  // 4. Função que mede a altura da lista de jogadores e guarda no estado
  const onLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && height !== contentHeight) {
      setContentHeight(height);
    }
  };

  

  return (
    <TouchableOpacity
      onPress={toggleExpand}
      onLongPress={() => onDelete(match.id)}
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: theme.card }]}
    >
      <View style={styles.teamsContainer}>
        {/* Bloco Time 1 */}
        <View style={[styles.teamColumn, { backgroundColor: match.winnerTeamIndex === 0 ? theme.accentGreen : theme.danger }]}>
          <View style={styles.marqueeContainer}>
            <Text style={styles.teamTitle} numberOfLines={1} ellipsizeMode="tail">
              {match.teamNames?.[0] || 'Time 1'}
            </Text>
          </View>
          <Animated.View style={[styles.playerListContainer, animatedStyle]}>
            {/* 5. A lista de jogadores agora fica dentro de uma View com onLayout */}
            {/* Ela está posicionada de forma absoluta para não ocupar espaço inicial, mas ser medida */}
            <View style={styles.measuringWrapper} onLayout={onLayout}>
              {match.teams[0].players.map(p => (
                <Text key={p.id} style={styles.playerName} numberOfLines={1}>{p.name}</Text>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* Bloco Central */}
        <View style={[styles.centerColumn, { backgroundColor: '#2c3e50' }]}>
          <Text style={[styles.scoreText, styles.sideScore]}>{match.scores?.[0] ?? '-'}</Text>
          <View style={styles.centerMiddle}>
            <Text style={styles.matchTitle}>Partida</Text>
            <Text style={styles.matchNumber}>{matchNumber}</Text>
          </View>
          <Text style={[styles.scoreText, styles.sideScore]}>{match.scores?.[1] ?? '-'}</Text>
        </View>

        {/* Bloco Time 2 */}
        <View style={[styles.teamColumn, { backgroundColor: match.winnerTeamIndex === 1 ? theme.accentGreen : theme.danger }]}>
          <View style={styles.marqueeContainer}>
            <Text style={styles.teamTitle} numberOfLines={1} ellipsizeMode="tail">
              {match.teamNames?.[1] || 'Time 2'}
            </Text>
          </View>
          <Animated.View style={[styles.playerListContainer, animatedStyle]}>
            <View style={styles.measuringWrapper} onLayout={onLayout}>
              {match.teams[1].players.map(p => (
                <Text key={p.id} style={styles.playerName} numberOfLines={1}>{p.name}</Text>
              ))}
            </View>
          </Animated.View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Seus novos estilos aplicados
const styles = StyleSheet.create({
    card: {
        borderRadius: 8,
        padding: 0,
        marginBottom: 12,
        overflow: 'hidden',
    },
    teamsContainer: {
        flexDirection: 'row',
        borderRadius: 8,
        overflow: 'hidden',
    },
    teamColumn: {
        flex: 1,
        paddingVertical: 18,
        paddingHorizontal: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    centerColumn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    centerMiddle: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    matchTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.7)',
    },
    matchNumber: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    scoreText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'rgba(255, 255, 255, 0.8)',
        marginVertical: 2,
    },
    sideScore: {
        minWidth: 28,
        textAlign: 'center',
    },
    teamTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    marqueeContainer: {
        width: '100%',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    playerName: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 4,
        textAlign: 'center',
    },
    playerListContainer: {
        overflow: 'hidden',
        alignItems: 'center',
        width: '100%',
    },
    measuringWrapper: {
        position: 'absolute',
        width: '100%',
    },
});

export default MatchDetailCard;