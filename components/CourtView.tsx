// components/CourtView.tsx (versão com fade-in na borda de vitória)

import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import FireIcon from '../assets/icons/fire.svg';
import useTheme from '../hooks/useTheme';
import { Match, Team } from '../types';
import { getCurrentWinStreak } from '../utils/helpers';
import PlayerAvatar from './PlayerAvatar';

interface CourtViewProps {
  teams: Team[];
  darkMode: boolean;
  winnerIndex: number | null;
  onSelectWinner: (index: number) => void;
  matchHistory: Match[];
  streakIconSize?: number;
}

const CourtView: React.FC<CourtViewProps> = ({ teams, darkMode, winnerIndex, onSelectWinner, matchHistory, streakIconSize }) => {
  const theme = useTheme(darkMode);
  const fireSize = streakIconSize ?? 20;
  
  const team1 = teams?.[0]?.players || [];
  const team2 = teams?.[1]?.players || [];

  const isTeam1Large = team1.length >= 10;
  const isTeam2Large = team2.length >= 10;

  const playerContainerStyle: ViewStyle = { width: isTeam1Large ? '23%' : '30%' };
  const avatarSize = isTeam1Large ? 40 : 50;

  // Valores animados para a opacidade das bordas
  const team1BorderOpacity = useRef(new Animated.Value(0)).current;
  const team2BorderOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (winnerIndex === 0) {
      Animated.timing(team1BorderOpacity, {
        toValue: 1,
        duration: 300, // Duração da animação em milissegundos
        useNativeDriver: false, // Opacidade não é nativa
      }).start();
      Animated.timing(team2BorderOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else if (winnerIndex === 1) {
      Animated.timing(team2BorderOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
      Animated.timing(team1BorderOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(team1BorderOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
      Animated.timing(team2BorderOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [winnerIndex, team1BorderOpacity, team2BorderOpacity]);

  return (
    <View style={[styles.courtContainer, { backgroundColor: '#0873a7' }]}>
      <View style={styles.playingSurface}>
        <View style={styles.teamHalf}>
          {team1.map(player => {
            const streak = getCurrentWinStreak(player.id, matchHistory);
            return (
              <View key={player.id} style={[styles.playerContainer, playerContainerStyle]}>
                <View style={{ position: 'relative' }}>
                  {streak >= 3 && (
                    <View style={[styles.streakBadge, { top: -Math.round(fireSize/3), right: -Math.round(fireSize/3) }]}>
                      <FireIcon width={fireSize} height={fireSize} fill="#ff3b30" />
                    </View>
                  )}
                  <PlayerAvatar player={player} size={avatarSize} theme={theme} />
                </View>
                <Text numberOfLines={1} style={styles.playerName}>{player.name}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.teamHalf}>
          {team2.map(player => {
            const streak = getCurrentWinStreak(player.id, matchHistory);
            return (
              <View key={player.id} style={[styles.playerContainer, playerContainerStyle]}>
                <View style={{ position: 'relative' }}>
                  {streak >= 3 && (
                    <View style={[styles.streakBadge, { top: -Math.round(fireSize/3), right: -Math.round(fireSize/3) }]}>
                      <FireIcon width={fireSize} height={fireSize} color="#ff3b30" />
                    </View>
                  )}
                  <PlayerAvatar player={player} size={avatarSize} theme={theme} />
                </View>
                <Text numberOfLines={1} style={styles.playerName}>{player.name}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.divider} />
      <Image
        source={require('../assets/images/net.png')}
        style={styles.netImage}
        resizeMode="stretch"
      />

      <View style={styles.overlayContainer}>
        <Animated.View
          style={[
            styles.clickArea,
            {
              top: 0,
              height: '49.75%',
              borderColor: theme.accentGreen,
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              borderBottomWidth: 0,
              opacity: team1BorderOpacity,
            },
          ]}
        >
          <TouchableOpacity style={{ flex: 1 }} onPress={() => onSelectWinner(0)} />
        </Animated.View>

        <Animated.View
          style={[
            styles.clickArea,
            {
              bottom: 0,
              height: '49.7%',
              borderColor: theme.accentGreen,
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8,
              borderTopWidth: 0,
              opacity: team2BorderOpacity,
            },
          ]}
        >
          <TouchableOpacity style={{ flex: 1 }} onPress={() => onSelectWinner(1)} />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  courtContainer: {
    flex: 1,
    marginVertical: 16,
    minHeight: 250,
    borderRadius: 8,
    padding: 30,
    overflow: 'hidden',
  },
  playingSurface: {
    flex: 1,
    backgroundColor: '#ff915c',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  teamHalf: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'center',
    padding: 8,
  },
  divider: {
    height: 3,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    transform: [{ translateY: 28.5 }],
    zIndex: 2,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFill as any,
    zIndex: 3,
  },
  clickArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderWidth: 5,
  },
  playerContainer: {
    alignItems: 'center',
    marginBottom: 8,
    zIndex: 1,
  },
  avatarBase: {
    borderWidth: 1,
    marginBottom: 4,
  },
  playerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffffff',
    marginTop: 4,
  },
  streakBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 8,
    backgroundColor: 'transparent',
    zIndex: 6,
  },
  netImage: {
    position: 'absolute',
    height: '92%',
    width: '100%',
    left: '50%',
    top: 0,
    transform: [
      { translateX: '-45.58%' },
      { translateY: 45 },
      { rotate: '-90deg' }
    ],
    zIndex: 2,
  },
});

export default CourtView;