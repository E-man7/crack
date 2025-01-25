import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const Fee = () => {
  return (
    <ScrollView style={styles.container}>
      {/* Fee Summary Section */}
      <View style={styles.feeSummary}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Term Fees</Text>
          <Text style={styles.infoValue}>45,000 Ksh</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Amount Paid</Text>
          <Text style={styles.infoValue}>30,000 Ksh</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Outstanding Fee</Text>
          <Text style={styles.infoValue}>1,500 Ksh</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Date Due</Text>
          <Text style={styles.infoValue}>03/09/24</Text>
        </View>
      </View>

      {/* Payment Options Section */}
      <View style={styles.paymentSection}>
        <Text style={styles.paymentTitle}>Payment Options</Text>
        <TouchableOpacity style={[styles.paymentButton, styles.mpesa]}>
          <Text style={styles.paymentText}>MPESA PAYBILL</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.paymentButton, styles.equityBank]}>
          <Text style={styles.paymentText}>Equity Bank</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.paymentButton, styles.kcbBank]}>
          <Text style={styles.paymentText}>KCB Bank</Text>
        </TouchableOpacity>
      </View>

      {/* Additional Options */}
      <View style={styles.additionalOptions}>
        <TouchableOpacity style={styles.dropdown}>
          <Text style={styles.dropdownText}>Transaction History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dropdown}>
          <Text style={styles.dropdownText}>Yearly Summary</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dropdown}>
          <Text style={styles.dropdownText}>Fee Policy</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  feeSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    margin: 20,
    backgroundColor: '#d9e7ff',
    borderRadius: 30,
    padding: 50,
  },
  infoBox: {
    width: '45%',
    backgroundColor: '#e8f0ff',
    margin: 10,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 5,
  },
  paymentSection: {
    margin: 10,
    alignItems: 'center',
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#444',
  },
  paymentButton: {
    width: '80%',
    marginVertical: 5,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  mpesa: {
    backgroundColor: '#4caf50',
  },
  equityBank: {
    backgroundColor: '#d2691e',
  },
  kcbBank: {
    backgroundColor: '#001f7f',
  },
  paymentText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  additionalOptions: {
    margin: 10,
  },
  dropdown: {
    backgroundColor: '#e8f0ff',
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  footerNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#d9e7ff',
    paddingVertical: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  navIcon: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#555',
  },
});

export default Fee;
