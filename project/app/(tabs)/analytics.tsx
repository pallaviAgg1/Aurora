import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AnalyticsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Sleep Insights</Text>

      <View style={styles.weeklyOverview}>
        <Text style={styles.sectionTitle}>Weekly Overview</Text>
        <View style={styles.barChart}>
          {[0.8, 0.6, 0.9, 0.7, 0.85, 0.5, 0.75].map((height, index) => (
            <View key={index} style={styles.barContainer}>
              <View style={[styles.bar, { height: `${height * 100}%` }]} />
              <Text style={styles.barLabel}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Text style={styles.statTitle}>This Week</Text>
          </View>
          <Text style={styles.statValue}>6:30 AM</Text>
          <Text style={styles.statLabel}>Avg. Wake Time</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Text style={styles.statTitle}>This Week</Text>
          </View>
          <Text style={styles.statValue}>2.3</Text>
          <Text style={styles.statLabel}>Snooze Attempts</Text>
        </View>
      </View>

      <View style={styles.achievementsContainer}>
        <Text style={styles.sectionTitle}>Recent Achievements</Text>
        <View style={styles.achievement}>
          <View style={styles.achievementIcon}>
            <Text>🎯</Text>
          </View>
          <View style={styles.achievementInfo}>
            <Text style={styles.achievementTitle}>5 Day Streak</Text>
            <Text style={styles.achievementDesc}>Woke up on the first alarm</Text>
          </View>
        </View>
        <View style={styles.achievement}>
          <View style={styles.achievementIcon}>
            <Text>🌅</Text>
          </View>
          <View style={styles.achievementInfo}>
            <Text style={styles.achievementTitle}>Early Bird</Text>
            <Text style={styles.achievementDesc}>Woke up before 7 AM</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#002a44', // deep navy
    padding: 20,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#ede5cf', // soft cream
    marginBottom: 24,
  },
  weeklyOverview: {
    backgroundColor: '#f3f2f5', // light card background
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1e253b', // dark slate
    marginBottom: 16,
  },
  barChart: {
    flexDirection: 'row',
    height: 160,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 24,
    backgroundColor: '#6b5aa0', // purple
    borderRadius: 12,
    marginBottom: 8,
  },
  barLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9ca7c0', // muted lavender-gray
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f3f2f5',
    borderRadius: 16,
    padding: 16,
  },
  statHeader: {
    marginBottom: 8,
  },
  statTitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#4a4a4a',
  },
  statValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#6b5aa0', // purple accent
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#4a4a4a',
  },
  achievementsContainer: {
    backgroundColor: '#f3f2f5',
    borderRadius: 16,
    padding: 16,
  },
  achievement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#002a44', // deep navy
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1e253b',
    marginBottom: 2,
  },
  achievementDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#4a4a4a',
  },
});
