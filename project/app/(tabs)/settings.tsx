import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Volume2, Vibrate as Vibration, Bell, Calendar, Nfc, Lock, AlertTriangle, Apple, Chrome, Activity, MapPin, Plus, Instagram, Youtube, Music } from 'lucide-react-native';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const router = useRouter();
  const [alarmSound, setAlarmSound] = useState('Morning Birds');
  const [volume, setVolume] = useState(75);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [appLockEnabled, setAppLockEnabled] = useState(true);
  const [selectedApps, setSelectedApps] = useState({
    instagram: false,
    tiktok: false,
    youtube: false
  });

  const alarmSounds = [
    'Morning Birds',
    'Gentle Waves',
    'Soft Piano',
    'Nature Sounds',
    'Digital Beep'
  ];

  const handleSoundChange = () => {
    Alert.alert(
      'Select Alarm Sound',
      'Choose your preferred alarm sound',
      alarmSounds.map(sound => ({
        text: sound,
        onPress: () => setAlarmSound(sound)
      }))
    );
  };

  const handleVolumeChange = (value: number) => {
    setVolume(Math.max(0, Math.min(100, value)));
  };

  const handleAppToggle = (app: string) => {
    setSelectedApps(prev => {
      const newState = { ...prev };
      // If the app being toggled is being enabled, disable all others
      if (!prev[app as keyof typeof prev]) {
        Object.keys(newState).forEach(key => {
          newState[key as keyof typeof prev] = false;
        });
      }
      newState[app as keyof typeof prev] = !prev[app as keyof typeof prev];
      return newState;
    });
  };

  const activateAlarm = async () => {
    try {
      const activationTime = new Date().toISOString();
      await AsyncStorage.setItem('alarmActive', activationTime);
      router.push('/alarm-active');
    } catch (error) {
      console.error('Error activating alarm:', error);
      Alert.alert('Error', 'Failed to activate alarm');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Activity size={24} color="#ede5cf" />
            <Text style={styles.sectionTitle}>Sleep Analysis</Text>
          </View>
          <View style={styles.settingCard}>
            <Text style={styles.errorText}>No sleep tracker connected</Text>
            <TouchableOpacity style={styles.connectButton}>
              <Text style={styles.connectButtonText}>Connect Device</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={24} color="#ede5cf" />
            <Text style={styles.sectionTitle}>Set Locations</Text>
          </View>
          <View style={styles.settingCard}>
            <View style={styles.locationItem}>
              <Text style={styles.locationText}>Home</Text>
            </View>
            <View style={styles.locationItem}>
              <Text style={styles.locationText}>Office</Text>
            </View>
            <TouchableOpacity style={styles.addButton}>
              <Plus size={20} color="#007AFF" />
              <Text style={styles.addButtonText}>Add Location</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={24} color="#ede5cf" />
            <Text style={styles.sectionTitle}>Integrate Calendar</Text>
          </View>
          <View style={styles.settingCard}>
            <View style={styles.calendarIntegration}>
              <View style={styles.calendarHeader}>
                <View style={styles.calendarTitleContainer}>
                  <Chrome size={20} color="#4285F4" />
                  <Text style={styles.calendarTitle}>Google Calendar</Text>
                </View>
                <Text style={styles.calendarStatus}>Not Connected</Text>
              </View>
              <View style={styles.calendarHeader}>
                <View style={styles.calendarTitleContainer}>
                  <Apple size={20} color="#000000" />
                  <Text style={styles.calendarTitle}>Apple Calendar</Text>
                </View>
                <Text style={[styles.calendarStatus, styles.connectedStatus]}>Connected</Text>
              </View>
              <Text style={styles.calendarDescription}>
                Connect your calendar to sync your events and appointments
              </Text>
              <TouchableOpacity 
                style={styles.connectButton}
                onPress={() => Alert.alert('Calendar Integration', 'Google Calendar integration coming soon!')}
              >
                <Text style={styles.connectButtonText}>Import Calendar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Lock size={24} color="#ede5cf" />
            <Text style={styles.sectionTitle}>App Lock Settings</Text>
          </View>
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>App locking</Text>
              <Switch
                value={appLockEnabled}
                onValueChange={setAppLockEnabled}
                trackColor={{ false: '#D1D1D6', true: '#34C759' }}
              />
            </View>
            <View style={styles.appList}>
              <View style={styles.appItem}>
                <View style={styles.appNameContainer}>
                  <Instagram size={20} color="#E1306C" />
                  <Text style={styles.appName}>Instagram</Text>
                </View>
                <Switch
                  value={selectedApps.instagram}
                  onValueChange={() => handleAppToggle('instagram')}
                  trackColor={{ false: '#D1D1D6', true: '#34C759' }}
                />
              </View>
              <View style={styles.appItem}>
                <View style={styles.appNameContainer}>
                  <Music size={20} color="#000000" />
                  <Text style={styles.appName}>TikTok</Text>
                </View>
                <Switch
                  value={selectedApps.tiktok}
                  onValueChange={() => handleAppToggle('tiktok')}
                  trackColor={{ false: '#D1D1D6', true: '#34C759' }}
                />
              </View>
              <View style={styles.appItem}>
                <View style={styles.appNameContainer}>
                  <Youtube size={20} color="#FF0000" />
                  <Text style={styles.appName}>YouTube</Text>
                </View>
                <Switch
                  value={selectedApps.youtube}
                  onValueChange={() => handleAppToggle('youtube')}
                  trackColor={{ false: '#D1D1D6', true: '#34C759' }}
                />
              </View>
            </View>
            <TouchableOpacity style={styles.addButton}>
              <Plus size={20} color="#007AFF" />
              <Text style={styles.addButtonText}>Add App</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.emergencyButton}>
          <View style={styles.emergencyButtonContent}>
            <AlertTriangle size={24} color="#ff3b30" />
            <Text style={styles.emergencyButtonText}>Emergency Override</Text>
          </View>
          <Text style={styles.confirmText}>Confirm</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#002a44',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#ede5cf',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#ede5cf',
  },
  settingCard: {
    backgroundColor: '#f3f2f5',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#4a4a4a',
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  connectButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  locationItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  locationText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#4a4a4a',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 12,
  },
  addButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#007AFF',
  },
  appList: {
    marginTop: 16,
    gap: 12,
  },
  appItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  appNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appName: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#4a4a4a',
  },
  emergencyButton: {
    flexDirection: 'row',
    backgroundColor: '#ffe5e5',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  emergencyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emergencyButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#ff3b30',
  },
  confirmText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6b5aa0',
  },
  calendarIntegration: {
    width: '100%',
    gap: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  calendarTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#4a4a4a',
  },
  calendarStatus: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#ff3b30',
  },
  connectedStatus: {
    color: '#34C759',
  },
  calendarDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9ca7c0',
    marginBottom: 16,
    lineHeight: 20,
  },
});
