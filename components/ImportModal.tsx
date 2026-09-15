import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

// External Dependencies
import { Camera, CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';

// Icons
import FileIcon from '../assets/icons/file.svg';
import QRCodeIcon from '../assets/icons/qr-code.svg';

// Hooks
import useTheme from '../hooks/useTheme';
import { useGameStore } from '../stores/gameStore';
import { usePlayersStore } from '../stores/playersStore';

// Types & Utils
import { AppData, importFromJSON, importPlayerFromQRCode } from '../utils/exportImportUtils';

interface ImportModalProps {
  visible: boolean;
  onClose: () => void;
  darkMode: boolean;
}

type ImportStep = 'select' | 'qr-scanner';

const ImportModal: React.FC<ImportModalProps> = ({ visible, onClose, darkMode }) => {
  const theme = useTheme(darkMode);
  const { setAllPlayers, setSelectedPlayerIds } = usePlayersStore();
  const { addMatch } = useGameStore();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<ImportStep>('select');
  const [isScanned, setIsScanned] = useState(false);

  const handleImportComplete = (importedData: AppData) => {
    Alert.alert(
      'Confirmar Importação',
      `Importar ${importedData.players.length} jogadores e ${importedData.matchHistory.length} partidas? Isso substituirá todos os dados atuais.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Importar',
          style: 'destructive',
          onPress: () => {
            setAllPlayers(importedData.players);
            setSelectedPlayerIds(new Set(importedData.selectedPlayerIds));
            importedData.matchHistory.forEach(match => {
              addMatch(match);
            });
            Alert.alert('Sucesso', 'Dados importados com sucesso!');
            handleClose();
          }
        }
      ]
    );
  };

  const handleImportJSON = async () => {
    setIsLoading(true);
    try {
      const importedData = await importFromJSON();
      if (importedData) {
        handleImportComplete(importedData);
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao importar arquivo JSON');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportQR = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão Necessária', 'É preciso autorizar o uso da câmera para escanear o QR Code.');
      return;
    }
    setCurrentStep('qr-scanner');
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (isScanned) return;
    setIsScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const importedPlayer = await importPlayerFromQRCode(data);
      if (importedPlayer) {
        Alert.alert(
          'Adicionar Jogador',
          `Deseja adicionar ${importedPlayer.name} à lista de jogadores?`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => setIsScanned(false) },
            {
              text: 'Adicionar',
              style: 'default',
              onPress: () => {
                const store = usePlayersStore.getState();
                const allPlayers = Array.isArray(store.allPlayers) ? store.allPlayers : [];
                if (allPlayers.some(p => p.id === importedPlayer.id)) {
                  Alert.alert('Jogador Existente', 'Este jogador já está cadastrado no sistema.');
                } else {
                  setAllPlayers([...allPlayers, importedPlayer]);
                  Alert.alert('Sucesso', 'Jogador adicionado com sucesso!');
                  handleClose();
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error scanning QR code:', error);
      Alert.alert('Erro', 'QR Code inválido ou corrompido');
      setIsScanned(false);
    }
  };

  const handleClose = () => {
    setCurrentStep('select');
    setIsScanned(false);
    onClose();
  };

  const renderSelectStep = () => (
    <>
      <Text style={[styles.modalTitle, { color: theme.text }]}>Importar Dados</Text>
      <Text style={[styles.modalSubtitle, { color: theme.placeholder }]}>
        Escolha o formato dos dados que você quer importar
      </Text>

      <TouchableOpacity
        style={[styles.optionButton, { backgroundColor: theme.background }]}
        onPress={handleImportJSON}
        disabled={isLoading}
      >
        <FileIcon stroke={theme.primary} width={24} height={24} />
        <View style={styles.optionTextContainer}>
          <Text style={[styles.optionTitle, { color: theme.text }]}>
            Arquivo JSON
          </Text>
          <Text style={[styles.optionDescription, { color: theme.placeholder }]}>
            Selecionar arquivo de backup do dispositivo
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.optionButton, { backgroundColor: theme.background }]}
        onPress={handleImportQR}
        disabled={isLoading}
      >
        <QRCodeIcon stroke={theme.primary} width={24} height={24} />
        <View style={styles.optionTextContainer}>
          <Text style={[styles.optionTitle, { color: theme.text }]}>
            Scanner QR Code
          </Text>
          <Text style={[styles.optionDescription, { color: theme.placeholder }]}>
            Escanear QR Code de outro dispositivo
          </Text>
        </View>
      </TouchableOpacity>
    </>
  );

  const renderScannerStep = () => (
    <View style={styles.scannerContainer}>
      <Text style={[styles.modalTitle, { color: theme.text }]}>Escanear QR Code</Text>
      <View style={styles.cameraWrapper}>
        <CameraView
          style={StyleSheet.absoluteFill as any}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"]
          }}
          onBarcodeScanned={isScanned ? undefined : handleBarcodeScanned}
        />
      </View>
      <TouchableOpacity
        style={[styles.scannerBackButton, { backgroundColor: theme.primary }]}
        onPress={() => setCurrentStep('select')}
      >
        <Text style={[styles.primaryButtonText, { color: '#fff' }]}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalView, { backgroundColor: theme.card }]}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={[styles.loadingText, { color: theme.placeholder }]}>
                    Importando dados...
                  </Text>
                </View>
              ) : (
                <>
                  {currentStep === 'select' && renderSelectStep()}
                  {currentStep === 'qr-scanner' && renderScannerStep()}
                </>
              )}

              {!isLoading && currentStep === 'select' && (
                <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                  <Text style={[styles.cancelButtonText, { color: theme.placeholder }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
    alignItems: 'stretch',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  cancelButton: {
    padding: 10,
    marginTop: 4,
  },
  cancelButtonText: {
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  scannerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16,
  },
  cameraWrapper: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#000',
  },
  scannerBackButton: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ImportModal;