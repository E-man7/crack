import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { BarChart, ProgressChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

const Home = () => {
  const barData = {
    labels: ['Math', 'English', 'Science', 'History', 'Art'],
    datasets: [
      {
        data: [80, 90, 85, 70, 95],
      },
    ],
  };

  const progressData = {
    labels: ['Paid', 'Outstanding'],
    data: [0.67, 0.33],
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://via.placeholder.com/80' }}
          style={styles.profileImage}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.name}>Name: Sophia Johnson</Text>
          <Text style={styles.grade}>Grade: 5</Text>
          <Text style={styles.adm}>ADM NO: sep22/45</Text>
        </View>
      </View>

      {/* Performance Section */}
      <View style={styles.performanceContainer}>
        <Text style={styles.performanceText}>Performance</Text>
        <BarChart
          data={barData}
          width={screenWidth - 40}
          height={220}
          yAxisSuffix="%"
          chartConfig={{
            backgroundColor: '#f5f5f5',
            backgroundGradientFrom: '#f5f5f5',
            backgroundGradientTo: '#f5f5f5',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 10 },
          }}
          style={styles.barChart}
        />
      </View>

      {/* Fee Section */}
      <View style={styles.feeContainer}>
        <View style={[styles.feeCard, styles.feeCardLarge]}>
          <Text style={styles.feeTitle}>Annual Fee</Text>
          <Text style={styles.feeValue}>123,000Ksh</Text>
        </View>
        <View style={[styles.feeCard, styles.feeCardLarge]}>
          <Text style={styles.feeTitle}>Amount Paid</Text>
          <Text style={styles.feeValue}>100,000Ksh</Text>
        </View>
        <View style={[styles.feeCard, styles.feeCardLarge]}>
          <Text style={styles.feeTitle}>Outstanding Fee</Text>
          <Text style={styles.feeValue}>1,500Ksh</Text>
        </View>
      </View>

      {/* Pie Chart Section */}
      <View style={styles.pieContainer}>
        <ProgressChart
          data={progressData}
          width={screenWidth - 40}
          height={150}
          strokeWidth={16}
          radius={32}
          chartConfig={{
            backgroundColor: '#f5f5f5',
            backgroundGradientFrom: '#f5f5f5',
            backgroundGradientTo: '#f5f5f5',
            color: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
          }}
          hideLegend={false}
          style={styles.progressChart}
        />
      </View>

      {/* Notifications Section */}
      <View style={styles.notificationsContainer}>
        <Text style={styles.notificationsText}>Notifications</Text>
        <View style={styles.notificationCard}>
          <Text style={styles.notificationCardText}>View Notifications</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: '#037f8c',
    padding: 40, // Increased padding
    alignItems: 'center',
  },
  profileImage: {
    width: 80, // Increased size
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18, // Increased font size
    color: '#ffffff',
    fontWeight: 'bold',
  },
  grade: {
    fontSize: 16, // Increased font size
    color: '#ffffff',
  },
  adm: {
    fontSize: 16, // Increased font size
    color: '#ffffff',
  },
  performanceContainer: {
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  performanceText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  barChart: {
    marginVertical: 8,
    borderRadius: 10,
  },
  feeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    marginVertical: 40,
  },
  feeCard: {
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    width: '30%',
  },
  feeCardLarge: {
    padding: 16, // Increased padding for visibility
  },
  feeTitle: {
    fontSize: 14, // Increased font size
    color: '#666',
  },
  feeValue: {
    fontSize: 16, // Increased font size
    fontWeight: 'bold',
    marginTop: 4,
  },
  pieContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  progressChart: {
    borderRadius: 10,
  },
  notificationsContainer: {
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  notificationsText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notificationCard: {
    backgroundColor: '#e0e0e0',
    padding: 16,
    borderRadius: 8,
  },
  notificationCardText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default Home;
