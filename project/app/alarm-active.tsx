import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback, Alert, Vibration, TouchableOpacity, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Smartphone, Check } from 'lucide-react-native';
import { Audio } from 'expo-av';

export default function AlarmActiveScreen() {
  const router = useRouter();
  const [lastTap, setLastTap] = useState<number | null>(null);
  const [showNfcScan, setShowNfcScan] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [scanStatusText, setScanStatusText] = useState('Ready to Scan');
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const slideAnim = useState(new Animated.Value(0))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Function to load and play the alarm sound
  const playAlarmSound = async () => {
    console.log('Loading alarm sound...');
    try {
      // Unload any existing sound first
      if (sound) {
        await sound.unloadAsync();
      }

      // Load the sound file
      const { sound: newSound } = await Audio.Sound.createAsync(
        require('../sounds/mixkit-retro-game-emergency-alarm-1000.wav'),
        { 
          isLooping: true,
          volume: 1.0 
        }
      );
      
      setSound(newSound);
      
      // Play the sound
      await newSound.playAsync();
      console.log('Alarm sound playing!');
    } catch (error) {
      console.error('Error playing alarm sound:', error);
    }
  };

  // Function to stop the alarm sound
  const stopAlarmSound = async () => {
    console.log('Stopping alarm sound...');
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }
    } catch (error) {
      console.error('Error stopping alarm sound:', error);
    }
  };

  // Animation for icon change
  const animateIconChange = () => {
    // Change status text
    setScanStatusText('Tag detected');
    
    // Show checkmark
    setShowCheckmark(true);
    
    // Stop the alarm sound
    stopAlarmSound();
    
    // Animate the slide down and fade out
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Wait a moment and then navigate back to main screen
    setTimeout(() => {
      router.replace('/(tabs)');
    }, 1500);
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300; // milliseconds

    if (lastTap && now - lastTap < DOUBLE_PRESS_DELAY) {
      // Double tap detected
      setLastTap(null); // Reset last tap time
      Vibration.vibrate(100); // Vibrate briefly on success

      // Stop vibration
      Vibration.cancel(); 

      // Show NFC scan UI after 1 second delay
      setTimeout(() => {
        setShowNfcScan(true);
        // Animate the slide up and fade in
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();

        // Simulate NFC scan completion after 1 second
        setTimeout(() => {
          animateIconChange();
        }, 1000);
      }, 1000);
    } else {
      // First tap (or tap after delay)
      setLastTap(now);
    }
  };

  // Handle cancel button press
  const handleCancel = () => {
    // Vibrate briefly to indicate button press
    Vibration.vibrate(100);
    
    // Stop alarm vibration
    Vibration.cancel();
    
    // Stop alarm sound
    stopAlarmSound();
    
    // Navigate back to main screen
    router.replace('/(tabs)');
  };

  // Effect for Vibration and Sound
  useEffect(() => {
    // --- Vibration --- 
    const VIBRATION_PATTERN = [
      1000, 1000, 1000, 1000,
    ];
    Vibration.vibrate(VIBRATION_PATTERN, true);

    // --- Sound --- 
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          interruptionModeIOS: 1,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          interruptionModeAndroid: 1,
          playThroughEarpieceAndroid: false,
        });
        
        await playAlarmSound();
      } catch (error) {
        console.error('Error setting up audio:', error);
      }
    };
    
    setupAudio();

    // Cleanup function
    return () => {
      console.log('Cleaning up alarm screen (vibration only)...');
      Vibration.cancel();
      if (sound) {
        console.log('Unloading sound in cleanup...');
        sound.unloadAsync();
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Main content area with tap detection */}
      <TouchableWithoutFeedback onPress={handleDoubleTap}>
        <View style={styles.alarmMessageContainer}>
          <Text style={styles.alarmText}>Double tap to scan Aurora</Text>
        </View>
      </TouchableWithoutFeedback>
      
      {/* Semi-transparent overlay */}
      {showNfcScan && (
        <Animated.View 
          style={[
            styles.overlay,
            {
              opacity: fadeAnim,
            }
          ]}
        />
      )}
      
      {/* NFC scanning UI as bottom sheet - only shown after double tap */}
      {showNfcScan && (
        <Animated.View 
          style={[
            styles.nfcScanContainer,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [400, 0],
                }),
              }],
            }
          ]}
        >
          <View style={styles.bottomSheetHandle} />
          
          <Text style={styles.readyToScan}>{scanStatusText}</Text>
          
          <View style={[
            styles.phoneIconContainer, 
            showCheckmark ? styles.checkmarkContainer : null
          ]}>
            {showCheckmark ? (
              <View style={styles.checkIconWrapper}>
                <Check size={40} color="#0A84FF" strokeWidth={3} />
              </View>
            ) : (
              <View style={styles.phoneIconWrapper}>
                <Smartphone size={70} color="#0A84FF" strokeWidth={2} />
              </View>
            )}
          </View>
          
          <Text style={styles.instructionText}>
            {showCheckmark ? 'Tag successfully detected.' : 'Hold your device near the NFC tag.'}
          </Text>
          
          <TouchableOpacity 
            style={[
              styles.cancelButton, 
              showCheckmark && styles.disabledButton
            ]}
            onPress={handleCancel}
            activeOpacity={0.7}
            disabled={showCheckmark}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF3B30',
    position: 'relative',
  },
  alarmMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  alarmText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  nfcScanContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.5,
    elevation: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
  },
  bottomSheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#CCCCCC',
    borderRadius: 3,
    marginBottom: 20,
  },
  readyToScan: {
    fontSize: 22,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 25,
  },
  phoneIconContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#E6F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 4,
    borderColor: '#0A84FF',
  },
  phoneIconWrapper: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E6F4FF',
    borderRadius: 45,
  },
  checkmarkContainer: {
    backgroundColor: 'transparent',
    borderWidth: 4,
    borderColor: '#0A84FF',
  },
  checkIconWrapper: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 25,
  },
  cancelButton: {
    width: '100%',
    padding: 15,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000000',
  },
});