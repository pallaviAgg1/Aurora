import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';

// Define the Alarm type
type Alarm = {
  time: string;
  days: string[];
};
import { SafeAreaView } from 'react-native-safe-area-context';
import { CircleCheck as CheckCircle2, Nfc } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import * as TaskManager from 'expo-task-manager'; // Uncommented
import * as BackgroundFetch from 'expo-background-fetch'; // Uncommented
// import NfcManager, { NfcTech, NfcEvents } from 'react-native-nfc-manager'; // Keep commented for Expo Go

// GLOBAL FLAG to prevent multiple alarm activations across components and re-renders
// This is outside of any component to ensure it persists across re-renders
let GLOBAL_ALARM_LOCK = false;
const ALARM_COOLDOWN_MS = 60000; // 60 seconds (1 minute)
let lastAlarmActivation = 0; // Global timestamp of last activation

const CHECK_ALARMS_TASK = 'CHECK_ALARMS_TASK'; // Uncommented

// Register the background task // Uncommented
TaskManager.defineTask(CHECK_ALARMS_TASK, async () => {
  console.log(`[${CHECK_ALARMS_TASK}] Task starting at: ${new Date().toISOString()}`);
  
  // First check global memory lock - this helps prevent triggering from background tasks
  // if the foreground already handled it
  if (GLOBAL_ALARM_LOCK) {
    console.log(`[${CHECK_ALARMS_TASK}] GLOBAL_ALARM_LOCK is active, skipping check`);
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  // Check cooldown period based on global variable
  const now = Date.now();
  if (now - lastAlarmActivation < ALARM_COOLDOWN_MS) {
    console.log(`[${CHECK_ALARMS_TASK}] Still in cooldown period (${Math.floor((now - lastAlarmActivation)/1000)}s elapsed, need ${Math.floor(ALARM_COOLDOWN_MS/1000)}s), skipping check`);
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  try {
    // First check if it's too soon since the last alarm trigger
    const lastTriggerString = await AsyncStorage.getItem('lastAlarmTriggerTime');
    if (lastTriggerString) {
      const lastTrigger = parseInt(lastTriggerString, 10);
      if (!isNaN(lastTrigger) && now - lastTrigger < 60000) { // 60 seconds
        console.log(`[${CHECK_ALARMS_TASK}] Too soon since last alarm (${Math.floor((now - lastTrigger)/1000)}s ago), skipping check`);
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }
    }

    // Double-check if alarmActive is already set to prevent duplication
    const alarmActiveCheck = await AsyncStorage.getItem('alarmActive');
    if (alarmActiveCheck === 'true') {
      console.log(`[${CHECK_ALARMS_TASK}] 'alarmActive' flag is already set, skipping check`);
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const savedAlarms = await AsyncStorage.getItem('alarms');
    console.log(`[${CHECK_ALARMS_TASK}] Raw savedAlarms string: ${savedAlarms}`);
    
    // Ensure savedAlarms is not null and is a valid JSON array
    let alarms: Alarm[] = [];
    if (savedAlarms) {
      try {
        const parsedAlarms = JSON.parse(savedAlarms);
        if (Array.isArray(parsedAlarms)) {
          alarms = parsedAlarms;
          console.log(`[${CHECK_ALARMS_TASK}] Parsed alarms successfully:`, alarms);
        }
      } catch (e) {
        console.error("Failed to parse alarms from storage in background task", e);
      }
    }
    
    const currentDate = new Date();
    const currentTime = `${currentDate.getHours().toString().padStart(2, '0')}:${currentDate
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
    const currentDay = currentDate.toLocaleDateString('en-US', { weekday: 'short' }); // e.g., 'Mon', 'Tue'

    console.log(`[${CHECK_ALARMS_TASK}] Current time check: ${currentTime}, Day check: ${currentDay}`);
    console.log(`Background task running at ${currentTime} on ${currentDay}. Checking alarms:`, alarms);

    // Check if any alarm matches the current time and day
    let isTriggered = false; // Use a flag
    alarms.forEach((alarm: Alarm, index: number) => {
      // Basic validation of alarm object structure
      if (typeof alarm.time !== 'string' || !Array.isArray(alarm.days)) {
        console.warn(`[${CHECK_ALARMS_TASK}] Skipping invalid alarm object at index ${index}:`, alarm);
        return; // Use return inside forEach to skip iteration
      }
      const isToday = alarm.days.includes(currentDay);
      const isTimeMatch = alarm.time === currentTime;
      console.log(`[${CHECK_ALARMS_TASK}] Checking alarm ${index}: Time=${alarm.time}, Days=${alarm.days.join(', ')}. Is today? ${isToday}. Is time match? ${isTimeMatch}`);
      if (isTimeMatch) {
        console.log(`[${CHECK_ALARMS_TASK}] Time match found for alarm ${index} (ignoring day)!`);
        isTriggered = true;
      }
    });

    if (isTriggered) {
      // Set global lock and timestamp
      GLOBAL_ALARM_LOCK = true;
      lastAlarmActivation = Date.now();

      console.log('Alarm triggered! Setting alarmActive flag.');
      console.log(`[${CHECK_ALARMS_TASK}] Attempting AsyncStorage.setItem('alarmActive', 'true')...`);
      await AsyncStorage.setItem('alarmActive', 'true');
      // Store timestamp to prevent repeated triggers
      const nowTimestamp = Date.now();
      await AsyncStorage.setItem('lastAlarmTriggerTime', nowTimestamp.toString());
      console.log(`[${CHECK_ALARMS_TASK}] Updated lastAlarmTriggerTime to ${nowTimestamp}`);
      // Keep the minute tracking for backward compatibility
      await AsyncStorage.setItem('lastAlarmMinute', currentTime);
      console.log(`[${CHECK_ALARMS_TASK}] AsyncStorage.setItem('alarmActive', 'true') completed.`);
      // Potentially add a local notification here if needed, but staying within Expo Go for now.
    }

    console.log(`[${CHECK_ALARMS_TASK}] Task finished at: ${new Date().toISOString()}`);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error(`[${CHECK_ALARMS_TASK}] Error during task execution:`, error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export default function HomeScreen() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const navigationLock = useRef(false); // Use ref for locking
  const lastAlarmMinute = useRef<string | null>(null); // Track the last minute an alarm was triggered
  const alarmTriggerTimestamp = useRef<number>(0); // Timestamp of last alarm trigger
  const router = useRouter();
  const isCheckingAlarms = useRef(false); // New flag to prevent concurrent checks
  const [isAlarmActive, setIsAlarmActive] = useState(false); // Track alarm state in component
  // Triple tap detection
  const [tapCount, setTapCount] = useState(0);
  const lastTapTime = useRef<number>(0);
  const TAP_TIMEOUT = 1000; // 1 second to register taps as part of same sequence

  // Handle screen taps for hidden debug feature
  const handleScreenTap = () => {
    const now = Date.now();
    // If it's been more than TAP_TIMEOUT since last tap, reset counter
    if (now - lastTapTime.current > TAP_TIMEOUT) {
      setTapCount(1);
    } else {
      // Otherwise increment tap count
      setTapCount(prev => prev + 1);
    }
    lastTapTime.current = now;
  };

  // Check for triple tap and set alarm if detected
  useEffect(() => {
    if (tapCount === 3) {
      // Reset tap count
      setTapCount(0);
      
      // Set alarm for next minute
      const setAlarmForNextMinute = async () => {
        try {
          console.log("[Hidden Feature] Setting alarm for next minute");
          
          // Get current time
          const now = new Date();
          now.setMinutes(now.getMinutes() + 1); // Add 1 minute
          
          // Format as HH:MM
          const alarmTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          
          // Get day of week
          const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'short' });
          
          // Create new alarm
          const newAlarm: Alarm = {
            time: alarmTime,
            days: [dayOfWeek] // Just current day
          };
          
          try {
            // Fetch the latest alarms directly from storage to ensure consistency
            const savedAlarms = await AsyncStorage.getItem('alarms');
            let alarmsArray: Alarm[] = [];
            
            // Properly parse existing alarms
            if (savedAlarms) {
              try {
                const parsed = JSON.parse(savedAlarms);
                alarmsArray = Array.isArray(parsed) ? parsed : [];
              } catch (parseError) {
                console.error("[Hidden Feature] Error parsing alarms:", parseError);
                alarmsArray = [];
              }
            }
            
            // Add new alarm at the beginning, so it's shown first in UI
            alarmsArray.unshift(newAlarm);
            
            // Save to storage
            await AsyncStorage.setItem('alarms', JSON.stringify(alarmsArray));
            console.log(`[Hidden Feature] Alarm set for ${alarmTime} (${dayOfWeek}), total alarms: ${alarmsArray.length}`);
            
            // Update the alarms state with the latest data
            setAlarms(alarmsArray);
            
            // Force a re-render of the screen to update UI
            loadAlarms();
          } catch (storageError) {
            console.error("[Hidden Feature] Error saving alarm to storage:", storageError);
          }
        } catch (error) {
          console.error("[Hidden Feature] Error setting alarm:", error);
        }
      };
      
      setAlarmForNextMinute();
    }
  }, [tapCount]);

  // Centralized helper to determine if it's too soon for a new alarm
  const isTooSoonForNewAlarm = async (): Promise<boolean> => {
    try {
      // First check the global lock
      if (GLOBAL_ALARM_LOCK) {
        console.log(`[Alarm Check] GLOBAL_ALARM_LOCK is active, skipping.`);
        return true;
      }

      // Check global timestamp
      const now = Date.now();
      if (now - lastAlarmActivation < ALARM_COOLDOWN_MS) {
        console.log(`[Alarm Check] Global cooldown active (${Math.floor((now - lastAlarmActivation)/1000)}s elapsed), skipping.`);
        return true;
      }

      // Check if we have a recent timestamp in memory
      if (now - alarmTriggerTimestamp.current < 60000) {  // 60 seconds
        console.log(`[Alarm Check] Too soon since last trigger (${Math.floor((now - alarmTriggerTimestamp.current)/1000)}s ago)`);
        return true;
      }
      
      // Also check AsyncStorage for persistence between sessions/background
      const lastTriggerString = await AsyncStorage.getItem('lastAlarmTriggerTime');
      if (lastTriggerString) {
        const lastTrigger = parseInt(lastTriggerString, 10);
        if (!isNaN(lastTrigger) && now - lastTrigger < 60000) {
          console.log(`[Alarm Check] Too soon since last stored trigger (${Math.floor((now - lastTrigger)/1000)}s ago)`);
          // Update the in-memory timestamp from storage
          alarmTriggerTimestamp.current = lastTrigger;
          return true;
        }
      }
      
      // Check if alarm is already active in AsyncStorage
      const alarmActive = await AsyncStorage.getItem('alarmActive');
      if (alarmActive === 'true') {
        console.log(`[Alarm Check] 'alarmActive' flag is already set, skipping check`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[Alarm Check] Error checking if too soon:', error);
      return false; // On error, allow trigger to be safe
    }
  };

  // Centralized helper to mark an alarm as triggered
  const markAlarmTriggered = async () => {
    const now = Date.now();
    console.log(`[Alarm Check] Marking alarm as triggered at ${new Date(now).toISOString()}`);
    // Update in-memory timestamp
    alarmTriggerTimestamp.current = now;
    // Set global timestamp and lock
    lastAlarmActivation = now;
    GLOBAL_ALARM_LOCK = true;
    setIsAlarmActive(true);
    // Also store in AsyncStorage for persistence
    await AsyncStorage.setItem('lastAlarmTriggerTime', now.toString());
    // Keep existing tracking as well
    const currentTime = new Date().toTimeString().substring(0, 5); // "HH:MM"
    lastAlarmMinute.current = currentTime;
    await AsyncStorage.setItem('lastAlarmMinute', currentTime);
  };

  // Function to check if any alarms match current time
  const checkAlarmsMatchCurrentTime = async (): Promise<boolean> => {
    if (isCheckingAlarms.current) {
      console.log(`[Foreground check] Already checking alarms, skipping concurrent check`);
      return false;
    }

    isCheckingAlarms.current = true; // Set lock to prevent concurrent checks

    try {
      // First check if it's too soon since last trigger
      if (await isTooSoonForNewAlarm()) {
        isCheckingAlarms.current = false; // Release lock
        return false;
      }
    
      const savedAlarms = await AsyncStorage.getItem('alarms');
      if (!savedAlarms) {
        isCheckingAlarms.current = false; // Release lock
        return false;
      }
      
      let alarms: Alarm[] = [];
      try {
        alarms = JSON.parse(savedAlarms);
        if (!Array.isArray(alarms)) {
          isCheckingAlarms.current = false; // Release lock
          return false;
        }
      } catch (e) {
        console.error("Failed to parse alarms:", e);
        isCheckingAlarms.current = false; // Release lock
        return false;
      }
      
      const now = new Date();
      // Format current time as HH:MM
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const currentDay = now.toLocaleDateString('en-US', { weekday: 'short' }); // e.g., 'Mon', 'Tue'
      
      console.log(`[Foreground check] Current time: ${currentTime}, Day: ${currentDay}, Checking ${alarms.length} alarms`);
      
      // Check each alarm for a match
      for (let i = 0; i < alarms.length; i++) {
        const alarm = alarms[i];
        if (typeof alarm.time !== 'string' || !Array.isArray(alarm.days)) continue;
        
        const isToday = alarm.days.includes(currentDay);
        const isTimeMatch = alarm.time === currentTime;
        
        console.log(`[Foreground check] Alarm ${i}: Time=${alarm.time}, Days=${alarm.days.join(', ')}. Today match? ${isToday}, Time match? ${isTimeMatch}`);
        
        // Ignoring day check as requested, only checking time match
        if (isTimeMatch) {
          console.log(`[Foreground check] Time match found (ignoring day)! Activating alarm.`);
          // Mark as triggered using centralized helper
          await markAlarmTriggered();
          isCheckingAlarms.current = false; // Release lock
          return true;
        }
      }
      
      isCheckingAlarms.current = false; // Release lock
      return false;
    } catch (error) {
      console.error("[Foreground check] Error checking alarms:", error);
      isCheckingAlarms.current = false; // Make sure to release lock on error
      return false;
    }
  };

  // Centralized function to handle navigation and locking using ref
  const handleNavigateToAlarm = async (triggerSource: string) => {
    // Check ref lock state
    if (navigationLock.current) {
      console.log(`[${triggerSource}] Navigation lock is active, skipping.`);
      return; 
    }
    
    // Check global lock too
    if (GLOBAL_ALARM_LOCK) {
      console.log(`[${triggerSource}] GLOBAL_ALARM_LOCK is active, but local lock wasn't. This shouldn't happen - resetting GLOBAL_ALARM_LOCK.`);
      // Continue anyway as we might need to fix a desync state
    }
    
    // Set lock immediately
    navigationLock.current = true;
    GLOBAL_ALARM_LOCK = true;
    lastAlarmActivation = Date.now();
    setIsAlarmActive(true);

    console.log(`[${triggerSource}] Alarm active flag found, acquiring lock and navigating...`);
    try {
      await AsyncStorage.removeItem('alarmActive');
      router.push('/alarm-active');
    } catch (error) {
      console.error(`[${triggerSource}] Error removing flag or navigating:`, error);
      // Reset lock on error to allow potential retry
      navigationLock.current = false; 
      GLOBAL_ALARM_LOCK = false;
      setIsAlarmActive(false);
    }
    // Note: Lock is reset on focus in useFocusEffect
  };

  // --- NFC Setup Functions (Commented Out) ---
  const startNfcSetup = async () => {
    Alert.alert('NFC Setup Disabled', 'This feature is temporarily disabled for debugging.');
    // try {
    //   const isSupported = await NfcManager.isSupported();
    //   if (!isSupported) {
    //     Alert.alert('Error', 'NFC is not supported on this device');
    //     return;
    //   }

    //   await NfcManager.start();
    //   setIsScanning(true);
    //   NfcManager.setEventListener(NfcEvents.DiscoverTag, handleNfcDiscovery);
    // } catch (error) {
    //   console.error('Error starting NFC scan:', error);
    //   Alert.alert('Error', 'Failed to start NFC scanning');
    // }
  };

  const stopNfcScan = () => {
    // NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
    // NfcManager.unregisterTagEvent();
    // setIsScanning(false);
  };

  const handleNfcDiscovery = async (tag: any) => {
    // try {
    //   const tagId = tag.id;
    //   await AsyncStorage.setItem('validNfcTagId', tagId);
    //   stopNfcScan();
    //   Alert.alert('Success', 'NFC tag has been set as your alarm disabler');
    // } catch (error) {
    //   console.error('Error handling NFC discovery:', error);
    //   Alert.alert('Error', 'Failed to save NFC tag');
    // }
  };
  // --- End NFC Setup Functions ---

  const loadAlarms = async () => {
    try {
      let alarms = [];

      // Load existing alarms
      const savedAlarms = await AsyncStorage.getItem('alarms');
      // Add null check before parsing
      alarms = savedAlarms ? JSON.parse(savedAlarms) : [];
      
      // Ensure it's an array
      if (!Array.isArray(alarms)) {
        alarms = [];
      }
      
      // Sort alarms if needed to make sure the upcoming one is first
      if (alarms.length > 1) {
        console.log("[loadAlarms] Sorting alarms to ensure next alarm is displayed first");
        // Simple sort by time (doesn't account for days, but that's okay for the basic display)
        alarms.sort((a, b) => {
          if (!a.time || !b.time) return 0;
          return a.time.localeCompare(b.time);
        });
      }

      setAlarms(alarms);
      console.log(`[loadAlarms] Loaded ${alarms.length} alarms. Next alarm: ${alarms.length > 0 ? alarms[0].time : 'none'}`);
    } catch (error) {
      console.error('Failed to load alarms:', error);
      // Set alarms to empty array on error to prevent crash
      setAlarms([]); 
    }
  };

  // Background Task Registration useEffect
  useEffect(() => {
    // Clear any lingering alarm active flag on initial app load
    AsyncStorage.removeItem('alarmActive').catch(err => console.error("Failed to clear alarmActive flag on init:", err));
    // Reset the last alarm minute in AsyncStorage too
    AsyncStorage.removeItem('lastAlarmMinute').catch(err => console.error("Failed to clear lastAlarmMinute on init:", err));
    // Reset alarmTriggerTimestamp
    console.log("[useEffect Mount] Resetting alarm timestamps");
    alarmTriggerTimestamp.current = 0;
    // Reset global locks
    GLOBAL_ALARM_LOCK = false;
    lastAlarmActivation = 0;
    isCheckingAlarms.current = false;
    setIsAlarmActive(false);
    // Reset navigation lock on mount
    console.log("[useEffect Mount] Resetting navigation lock.");
    navigationLock.current = false;
    lastAlarmMinute.current = null; // Reset the last alarm minute

    const registerBackgroundTask = async () => {
      try {
        // Check permissions first (Important for background tasks)
        const backgroundStatus = await BackgroundFetch.getStatusAsync();
        if (backgroundStatus === BackgroundFetch.BackgroundFetchStatus.Restricted || backgroundStatus === BackgroundFetch.BackgroundFetchStatus.Denied) {
          console.log('Background fetch permission denied or restricted.');
          Alert.alert(
              'Permissions Required',
              'This app needs background execution permissions to trigger alarms reliably. Please enable Background App Refresh in your device settings.'
          );
          return;
        }

        const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(CHECK_ALARMS_TASK);
        if (!isTaskRegistered) {
          console.log('Registering background task...');
          await BackgroundFetch.registerTaskAsync(CHECK_ALARMS_TASK, {
            minimumInterval: 120, // Check every 2 minutes to reduce chances of overlaps
            stopOnTerminate: false, // Keep running even if app is terminated (iOS specific behavior varies)
            startOnBoot: true, // Attempt to start task on device boot (Android specific)
          });
          console.log('Background task registered.');
        } else {
          console.log('Background task already registered.');
        }
      } catch (error) {
         console.error('Failed to register background task:', error);
         Alert.alert('Error', 'Could not set up background alarm checking.');
      }
    };

    registerBackgroundTask();

    // Optional: Cleanup function to unregister task if component unmounts
    // return () => {
    //   console.log('Unregistering background task...');
    //   BackgroundFetch.unregisterTaskAsync(CHECK_ALARMS_TASK);
    // };
  }, []);

  // Alarm Check useEffect (Foreground check)
  useEffect(() => {
    // This is the core alarm check logic that runs in the foreground
    const checkAlarms = async () => {
      try {
        console.log("[Foreground check] Running alarm check...");
      
        // First check if we have any alarm matches for the current time
        const alarmMatched = await checkAlarmsMatchCurrentTime();
        
        if (alarmMatched) {
          console.log("[Foreground check] Alarm match detected, setting flag");
          // If an alarm matched, set the flag and the foreground check will pick it up
          await AsyncStorage.setItem('alarmActive', 'true');
        }
        
        // Then check if the alarmActive flag is set (either by this check or background task)
        const alarmActive = await AsyncStorage.getItem('alarmActive');
        if (alarmActive === 'true') {
          console.log("[Foreground check] alarmActive flag detected");
          // Call the centralized handler to trigger the alarm screen
          handleNavigateToAlarm('foregroundCheck');
        }
      } catch (error) {
        console.error('[foregroundCheck] Error during alarm check:', error);
      }
    };

    let checkInterval: NodeJS.Timeout;
    
    // Run the check immediately
    checkAlarms();
    
    // Then set up interval to check every 30 seconds
    checkInterval = setInterval(checkAlarms, 30000); // Reduced frequency to 30 seconds
    
    // Cleanup on unmount
    return () => {
      if (checkInterval) clearInterval(checkInterval);
      console.log("[Foreground check] Cleaned up interval");
    };
  }, [router]); // Keep router dependency

  // UseFocusEffect to reload alarms and check flag/reset lock
  useFocusEffect(
    React.useCallback(() => {
      console.log('HomeScreen focused, reloading alarms and checking flag...');
      loadAlarms();

      // Reset navigation lock when the screen comes into focus
      if (navigationLock.current) {
          console.log('[useFocusEffect] Resetting navigation lock.');
          navigationLock.current = false;
          // Note: We don't reset lastAlarmMinute.current here to prevent retriggering
      }

      // Check if we're returning from the alarm screen
      if (GLOBAL_ALARM_LOCK && isAlarmActive) {
        console.log('[useFocusEffect] Returned from alarm screen, resetting alarm state');
        // Only release global lock if we're coming back from alarm screen
        setIsAlarmActive(false);
        // Keep the 60-second cooldown via lastAlarmActivation
      }

      // Check alarm status immediately on focus
      const checkAlarmOnFocus = async () => {
        try {
          const alarmActive = await AsyncStorage.getItem('alarmActive');
          if (alarmActive === 'true') {
            // Call the centralized handler
            handleNavigateToAlarm('useFocusEffect');
          }
        } catch (error) {
          console.error('[useFocusEffect] Error checking alarm status on focus:', error);
        }
      };
      checkAlarmOnFocus();
    }, [router]) // Keep router dependency
  );

  // --- DEBUGGING: Manual Trigger --- 
  const manualTriggerAlarm = async () => {
    console.log("Manually setting alarmActive flag to true...");
    try {
      await AsyncStorage.setItem('alarmActive', 'true');
      Alert.alert("Manual Trigger", "alarmActive flag set to true. The check effect should pick it up shortly.");
    } catch (e) {
      console.error("Failed to manually set alarmActive flag:", e);
      Alert.alert("Error", "Could not manually set flag.");
    }
  };
  // --- END DEBUGGING ---

  return (
    <SafeAreaView style={styles.container} onTouchStart={handleScreenTap}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good Morning, Aurora!</Text>
        <Text style={styles.nextAlarm}>
          {/* Add null/length check for safety */}
          {alarms && alarms.length > 0 ? `Next alarm at ${alarms[0].time}` : 'No alarms set. Add one to get started!'}
        </Text>
      </View>

      <View style={styles.alarmCard}>
        {/* Add null/length check for safety */}
        {alarms && alarms.length > 0 ? (
          <>
            <Text style={styles.alarmTime}>{alarms[0].time}</Text>
            <Text style={styles.alarmDays}>{alarms[0].days.join(', ')}</Text>
          </>
        ) : (
          <Text style={styles.noAlarmsText}>No alarms set. Add one to get started!</Text>
        )}
      </View>

      <View style={styles.brickStatus}>
        <View style={styles.statusIcon}>
          <CheckCircle2 color="#34C759" size={24} />
        </View>
        <View style={styles.statusText}>
          <Text style={styles.statusTitle}>Aurora NFC registered</Text>
          <Text style={styles.statusSubtitle}>Ready for scanning</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Average Wake Time</Text>
          <Text style={styles.statValue}>6:30 AM</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Success Rate</Text>
          <Text style={styles.statValue}>92%</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.nfcButton}
        onPress={startNfcSetup} // Keep onPress pointing to the (now disabled) function
        disabled={isScanning}
      >
        <Nfc size={24} color="#4A4A4A" />
        <Text style={styles.nfcButtonText}>
          {isScanning ? 'Scanning for NFC tag...' : 'Set Up NFC Tag'}
        </Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

// Styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#002a44',
  },
  header: {
    padding: 20,
  },
  greeting: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#ede5cf',
    marginBottom: 4,
  },
  nextAlarm: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#9ca7c0',
  },
  alarmCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#f3f2f5',
    borderRadius: 16,
  },
  alarmTime: {
    fontFamily: 'Inter-Bold',
    fontSize: 40,
    color: '#6b5aa0',
    marginBottom: 8,
  },
  alarmDays: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#9ca7c0',
  },
  noAlarmsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#9ca7c0',
  },
  brickStatus: {
    margin: 20,
    padding: 16,
    backgroundColor: '#e0f7ec',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 12,
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#34C759',
    marginBottom: 2,
  },
  statusSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#4a4a4a',
  },
  stats: {
    flexDirection: 'row',
    margin: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f3f2f5',
    borderRadius: 12,
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9ca7c0',
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#6b5aa0',
  },
  nfcButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: '#f3f2f5',
    borderRadius: 8,
    justifyContent: 'center',
  },
  nfcButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#4a4a4a',
  },
});
