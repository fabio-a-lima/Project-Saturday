import React from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// External Dependencies
import Checkbox from 'expo-checkbox';
import { LinearGradient } from 'expo-linear-gradient';

// Icons
import FireIcon from '../assets/icons/fire.svg';
import UserIcon from '../assets/icons/user.svg';

// Hooks
import useTheme from '../hooks/useTheme';

// Types
import { Match, Player } from '../types';

// Utils
import { calculatePlayerStats, getCurrentWinStreak } from '../utils/helpers';

// Components
import PlayerAvatar from './PlayerAvatar';

interface PlayerCardProps {
  player: Player;
  darkMode: boolean;
  onToggleActive: (id: string) => void;
  onLongPress: (player: Player) => void;
  variant: 'grid' | 'list';
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (playerId: string) => void;
  matchHistory: Match[];
  hideCheckbox?: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  darkMode,
  onToggleActive,
  onLongPress,
  variant,
  selectable,
  isSelected,
  onSelect,
  matchHistory,
  hideCheckbox = false,
}) => {
  const theme = useTheme(darkMode);

  const handlePress = () => {
    if (selectable && onSelect) {
      onSelect(player.id);
    } else {
      onToggleActive(player.id);
    }
  };

  const hasPhoto = !!player.photoUri;
  const isInactive = !player.active;

  const stats = calculatePlayerStats(player.id, matchHistory);

  const inactiveStyle = { opacity: 0.6 };
  const inactiveTextStyle = { textDecorationLine: 'line-through' as 'line-through' };

  const streak = getCurrentWinStreak(player.id, matchHistory);

  if (variant === 'grid') {
    return (
      <TouchableOpacity
        style={styles.playerCardGrid}
        onPress={handlePress}
        onLongPress={() => onLongPress(player)}
        activeOpacity={0.8}
      >
        {hasPhoto ? (
          <ImageBackground
            source={{ uri: player.photoUri }}
            style={styles.gridImageBackground}
            imageStyle={[styles.gridImageStyle, isInactive && inactiveStyle]} // Applies opacity to the image
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.gridOverlay}
            >
              <Text style={[styles.gridPlayerName, isInactive && inactiveTextStyle]} numberOfLines={2}>
                {player.name}
              </Text>
            </LinearGradient>
            {isInactive && <View style={styles.inactiveOverlay} />}
          </ImageBackground>
        ) : (
          <View style={[styles.gridImageBackground, styles.gridNoImage, isInactive && inactiveStyle]}>
            <UserIcon width={60} height={60} fill={theme.placeholder} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.gridOverlayAbsolute}
            >
              <Text style={[styles.gridPlayerName, isInactive && inactiveTextStyle]} numberOfLines={2}>
                {player.name}
              </Text>
            </LinearGradient>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // List Variant
  return (
    <TouchableOpacity
      style={[
        styles.listCard,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardInactive,
        },
        isInactive && !selectable && { opacity: 0.7 },
      ]}
      onPress={() => onSelect && onSelect(player.id)}
      onLongPress={() => onLongPress(player)}
      activeOpacity={0.8}
    >
      <View style={styles.listContent}>
        <View style={{ position: 'relative' }}>
          {streak >= 3 && (
            <View style={styles.streakBadge}>
              <FireIcon width={18} height={18} fill="#ff3b30" />
            </View>
          )}
          <PlayerAvatar player={player} size={60} theme={theme} />
        </View>

        <View style={styles.playerInfo}>
          <Text style={[styles.playerName, { color: theme.text }]} numberOfLines={1}>
            {player.name}
          </Text>
          
          {/* 3. Exibir a nova informação */}
          <Text style={[styles.playerStats, { color: theme.placeholder }]}>
            Nível: {player.weight}
            {stats.winRate !== null
              ? ` • Vitórias: ${stats.winRate}% • (${stats.gamesPlayed} jogos)`
              : ' • Nenhum jogo registrado'}
          </Text>

        </View>

        {selectable && !hideCheckbox && (
          <View style={styles.checkboxContainer}>
            <Checkbox
              style={styles.checkbox}
              value={isSelected}
              onValueChange={() => onSelect && onSelect(player.id)}
              color={isSelected ? theme.accentGreen : theme.text}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  playerCardBase: {
    borderRadius: 8,
    justifyContent: 'center',
    borderWidth: 1,
  },
  playerCardList: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightContainer: {
    width: 28,
    height: 28,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  weightText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  listAvatar: {
    width: 30,
    height: 30,
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  playerCardGrid: {
    flex: 1,
    margin: 4,
    maxWidth: '31%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  gridImageBackground: {
    flex: 1,
    justifyContent: 'flex-end',
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridImageStyle: {
    borderRadius: 8,
  },
  gridNoImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3972aa1e',
  },
  gridOverlay: {
    padding: 8,
    zIndex: 1,
  },
  streakBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'transparent',
    zIndex: 6,
  },
  gridOverlayAbsolute: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
  },
  gridPlayerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  inactiveOverlay: {
    ...(StyleSheet.absoluteFill as any), // Faz a View preencher todo o componente pai
    backgroundColor: '#1e1e1ea6', // Cor cinza escura semi-transparente
    borderRadius: 8, // Mantém as bordas arredondadas do card
  },
  listAvatarOverlay: {
    borderRadius: 4,
  },
  listAvatarNoPhoto: {
    backgroundColor: '#e1e4e8'
  },
  listCard: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  listContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerInfo: {
    flex: 1, // Ocupa o espaço disponível entre o avatar e o checkbox
    marginLeft: 12,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  playerStats: {
    fontSize: 14,
    marginTop: 2,
  },
  checkboxContainer: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
    paddingLeft: 10,
  },
  checkbox: {
    width: 28,
    height: 28,
  },
});


export default PlayerCard;