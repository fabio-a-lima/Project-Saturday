// utils/exportImportUtils.ts
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { Match, Player } from '../types';

export interface AppData {
  version: string;
  exportDate: string;
  players: Player[];
  selectedPlayerIds: string[];
  matchHistory: Match[];
  images?: { [key: string]: string }; // Base64 encoded image data
}

export interface SinglePlayerData {
  version: string;
  exportDate: string;
  player: Player;
  image?: string; // Base64 encoded image data
}

// Export Methods

export const exportAsJSON = async (data: AppData): Promise<boolean> => {
  try {
    const fileName = `volleyball-backup-${new Date().toISOString().split('T')[0]}.json`;
    const fileUri = `${(FileSystem as any).documentDirectory}${fileName}`;
    
    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(data, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 }
    );

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Compartilhar backup dos dados',
      });
    } else {
      Alert.alert('Erro', 'Compartilhamento não disponível neste dispositivo');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error exporting JSON:', error);
    Alert.alert('Erro', 'Falha ao exportar dados como JSON');
    return false;
  }
};

export const exportPlayerAsQRCode = async (player: Player): Promise<string | null> => {
  try {
    console.log('Starting QR code export for player:', player.name);
    let imageData: string | undefined;
    
    if (player.photoUri) {
      try {
        console.log('Attempting to read player image:', player.photoUri);
        imageData = await FileSystem.readAsStringAsync(player.photoUri, {
          encoding: FileSystem.EncodingType.Base64
        });
        console.log('Successfully read image data');
      } catch (error) {
        console.error(`Failed to read image for player ${player.name}:`, error);
        imageData = undefined; // Ensure it's undefined if reading fails
      }
    }

    // First try with image
    let singlePlayerData: SinglePlayerData = {
      version: '2.0.0',
      exportDate: new Date().toISOString(),
      player: {
        ...player,
        photoUri: undefined // We'll handle the photo separately
      },
      image: imageData
    };

    let jsonString = JSON.stringify(singlePlayerData);
    console.log('QR data size with image:', jsonString.length, 'bytes');
    
    // If data is too large, try without image
    if (jsonString.length > 2000) {
      console.log('Data too large, removing image');
      singlePlayerData.image = undefined;
      jsonString = JSON.stringify(singlePlayerData);
      console.log('QR data size without image:', jsonString.length, 'bytes');
      
      // Only show alert if we had to remove an image
      if (imageData) {
        Alert.alert(
          'Imagem Removida',
          'A foto foi removida do QR Code pois era muito grande. Os outros dados do jogador serão exportados normalmente.'
        );
      }
    }

    return jsonString;
  } catch (error) {
    console.error('Error preparing QR code data:', error);
    Alert.alert('Erro', 'Falha ao preparar dados para QR Code');
    return null;
  }
};

// Import Methods

export const importFromJSON = async (): Promise<AppData | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return null;
    }

    const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
    const data = JSON.parse(fileContent) as AppData;
    
    return await validateImportedData(data);
  } catch (error) {
    console.error('Error importing JSON:', error);
    Alert.alert('Erro', 'Arquivo JSON inválido ou corrompido');
    return null;
  }
};

export const importPlayerFromQRCode = async (qrData: string): Promise<Player | null> => {
  try {
    const parsedData = JSON.parse(qrData) as SinglePlayerData;
    
    if (!parsedData.player || !parsedData.player.id || !parsedData.player.name) {
      throw new Error('Dados do jogador inválidos');
    }

    const isLegacy = !parsedData.version || parsedData.version === '1.0.0';
    if (isLegacy && parsedData.player.fundamentals) {
      const p = parsedData.player;
      p.fundamentals!.serve = Math.min(10, p.fundamentals!.serve * 2);
      p.fundamentals!.passing = Math.min(10, p.fundamentals!.passing * 2);
      p.fundamentals!.setting = Math.min(10, p.fundamentals!.setting * 2);
      p.fundamentals!.attacking = Math.min(10, p.fundamentals!.attacking * 2);
      p.fundamentals!.blocking = Math.min(10, p.fundamentals!.blocking * 2);
    }

    // If there's an image, save it
    if (parsedData.image) {
      try {
        const newPhotoUri = `${(FileSystem as any).documentDirectory}avatars/${parsedData.player.id}.jpg`;
        await FileSystem.makeDirectoryAsync(`${(FileSystem as any).documentDirectory}avatars/`, { intermediates: true });
        await FileSystem.writeAsStringAsync(newPhotoUri, parsedData.image, {
          encoding: FileSystem.EncodingType.Base64
        });
        parsedData.player.photoUri = newPhotoUri;
      } catch (error) {
        console.error(`Failed to save image for player ${parsedData.player.name}:`, error);
      }
    }

    return parsedData.player;
  } catch (error) {
    console.error('Error importing QR code:', error);
    Alert.alert('Erro', 'QR Code inválido ou corrompido');
    return null;
  }
};



// Helper Functions

const validateImportedData = async (data: any): Promise<AppData | null> => {
  try {
    // Basic validation
    if (!data || typeof data !== 'object') {
      throw new Error('Dados inválidos');
    }

    // Validate players array
    if (!Array.isArray(data.players)) {
      throw new Error('Lista de jogadores inválida');
    }

    // Validate each player
    data.players.forEach((player: any, index: number) => {
      if (!player.id || !player.name || typeof player.active !== 'boolean') {
        throw new Error(`Jogador ${index + 1} tem dados inválidos`);
      }
      if (![1, 2, 3].includes(player.weight)) {
        throw new Error(`Jogador ${player.name} tem nível inválido`);
      }
    });

    // Validate selectedPlayerIds
    if (!Array.isArray(data.selectedPlayerIds)) {
      data.selectedPlayerIds = [];
    }

    // Validate match history
    if (!Array.isArray(data.matchHistory)) {
      data.matchHistory = [];
    }

    // If there are images, save them to the file system
    if (data.images) {
      for (const player of data.players) {
        if (player.photoUri && data.images[player.photoUri]) {
          try {
            const newPhotoUri = `${(FileSystem as any).documentDirectory}avatars/${player.id}.jpg`;
            await FileSystem.makeDirectoryAsync(`${(FileSystem as any).documentDirectory}avatars/`, { intermediates: true });
            await FileSystem.writeAsStringAsync(newPhotoUri, data.images[player.photoUri], {
              encoding: FileSystem.EncodingType.Base64
            });
            player.photoUri = newPhotoUri;
          } catch (error) {
            console.error(`Failed to save image for player ${player.name}:`, error);
            player.photoUri = undefined;
          }
        }
      }
    }

    const isLegacy = !data.version || data.version === '1.0.0';
    if (isLegacy) {
      data.players.forEach((p: any) => {
        if (p.fundamentals) {
          p.fundamentals.serve = Math.min(10, p.fundamentals.serve * 2);
          p.fundamentals.passing = Math.min(10, p.fundamentals.passing * 2);
          p.fundamentals.setting = Math.min(10, p.fundamentals.setting * 2);
          p.fundamentals.attacking = Math.min(10, p.fundamentals.attacking * 2);
          p.fundamentals.blocking = Math.min(10, p.fundamentals.blocking * 2);
        }
      });
      data.matchHistory.forEach((m: any) => {
        m.teams.forEach((t: any) => {
          t.players.forEach((p: any) => {
            if (p.fundamentals) {
              p.fundamentals.serve = Math.min(10, p.fundamentals.serve * 2);
              p.fundamentals.passing = Math.min(10, p.fundamentals.passing * 2);
              p.fundamentals.setting = Math.min(10, p.fundamentals.setting * 2);
              p.fundamentals.attacking = Math.min(10, p.fundamentals.attacking * 2);
              p.fundamentals.blocking = Math.min(10, p.fundamentals.blocking * 2);
            }
          });
          if (t.fundamentals) {
            t.fundamentals.serve = Math.min(100, t.fundamentals.serve * 2);
            t.fundamentals.passing = Math.min(100, t.fundamentals.passing * 2);
            t.fundamentals.setting = Math.min(100, t.fundamentals.setting * 2);
            t.fundamentals.attacking = Math.min(100, t.fundamentals.attacking * 2);
            t.fundamentals.blocking = Math.min(100, t.fundamentals.blocking * 2);
          }
        });
      });
    }

    return {
      version: '2.0.0', // Upgrade version after migration
      exportDate: data.exportDate || new Date().toISOString(),
      players: data.players,
      selectedPlayerIds: data.selectedPlayerIds,
      matchHistory: data.matchHistory,
      images: data.images
    };
  } catch (error) {
    Alert.alert('Erro de Validação', error instanceof Error ? error.message : 'Dados corrompidos');
    return null;
  }
};

export const generateAppData = async (
  players: Player[], 
  selectedPlayerIds: Set<string>, 
  matchHistory: Match[]
): Promise<AppData> => {
  // Collect all images
  const images: { [key: string]: string } = {};
  for (const player of players) {
    if (player.photoUri) {
      try {
        const imageBase64 = await FileSystem.readAsStringAsync(player.photoUri, {
          encoding: FileSystem.EncodingType.Base64
        });
        images[player.photoUri] = imageBase64;
      } catch (error) {
        console.error(`Failed to read image for player ${player.name}:`, error);
      }
    }
  }

  return {
    version: '2.0.0',
    exportDate: new Date().toISOString(),
    players,
    selectedPlayerIds: Array.from(selectedPlayerIds),
    matchHistory,
    images
  };
};