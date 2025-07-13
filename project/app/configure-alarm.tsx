import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

export default function ConfigureAlarmScreen() {
  const [time, setTime] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState(['M', 'T', 'W', 'Th', 'F']);
  const days = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];
  const router = useRouter();

  // Map day codes to Notification weekday (Sun=1, Mon=2,...)
  const dayMap: { [key: string]: number } = { M: 2, T: 3, W: 4, Th: 5, F: 6, Sa: 7, Su: 1 };

  // Request notification permissions on mount
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
    })();
  }, []);

  const toggleDaySelection = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleTimeChange = (event: any, selectedTime: Date | undefined) => {
    if (event.type === "set" && selectedTime) {
      setTime(selectedTime); // Update the time state
    }
  };

  const saveAlarm = async () => {
    if (selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one day for the alarm.');
      return;
    }

    const alarmTime = `${time.getHours().toString().padStart(2, '0')}:${time
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;

    const newAlarm = {
      time: alarmTime,
      days: selectedDays,
    };

    try {
      const savedAlarms = await AsyncStorage.getItem('alarms');
      const alarms = savedAlarms ? JSON.parse(savedAlarms) : [];
      alarms.push(newAlarm);
      await AsyncStorage.setItem('alarms', JSON.stringify(alarms));
      Alert.alert('Alarm Saved', `Alarm set for ${alarmTime} on ${selectedDays.join(', ')}.`);
      router.push('/set-alarm');

      // Schedule weekly notifications for each selected day
      for (const day of selectedDays) {
        const weekday = dayMap[day];
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Alarm',
            body: `Alarm ringing at ${alarmTime}`,
            sound: 'default',
            data: { screen: '/alarm-active' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            weekday,
            hour: time.getHours(),
            minute: time.getMinutes(),
            repeats: true,
          },
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save the alarm. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Configure Alarm</Text>
      {/* Inline spinner time picker */}
      <DateTimePicker
        value={time}
        mode="time"
        is24Hour={true}
        display="spinner"
        onChange={handleTimeChange}
        style={{ width: '100%', height: 150, marginBottom: 24 }}
        textColor="#FFFFFF"
        accentColor="#FFFFFF"
        themeVariant="dark"
      />

      <View style={styles.daysContainer}>
        {days.map((day) => (
          <TouchableOpacity
            key={day}
            style={[
              styles.dayButton,
              selectedDays.includes(day) && styles.dayButtonSelected,
            ]}
            onPress={() => toggleDaySelection(day)}
          >
            <Text
              style={[
                styles.dayText,
                selectedDays.includes(day) && styles.dayTextSelected,
              ]}
            >
              {day}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveAlarm}>
        <Text style={styles.saveButtonText}>Save Alarm</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#002a44',
    padding: 20,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#ede5cf',
    marginBottom: 24,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f2f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#6b5aa0',
  },
  dayText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#6b5aa0',
  },
  dayTextSelected: {
    color: '#ede5cf',
  },
  saveButton: {
    backgroundColor: '#6b5aa0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  saveButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#ede5cf',
  },
});