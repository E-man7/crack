import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import supabase from '../../supabase';

const Fee = () => {
  const [feeData, setFeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    transactionHistory: false,
    yearlySummary: false,
    feePolicy: false,
  });
  const [selectedPaymentOption, setSelectedPaymentOption] = useState(null);

  // Fetch fee data from Supabase
  useEffect(() => {
    const fetchFeeData = async () => {
      try {
        // Get the current authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) throw authError;

        // Fetch fee data from the 'fees' table using adm_no
        const { data, error } = await supabase
          .from('fees')
          .select('*')
          .eq('adm_no', user.user_metadata.adm_no)
          .maybeSingle(); // Use maybeSingle to handle no rows

        if (error) throw error;

        // Set the fee data in state
        setFeeData(data);
      } catch (error) {
        console.error('Error fetching fee data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeeData();
  }, []);

  // Toggle dropdown sections
  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Handle payment option click
  const handlePaymentOptionClick = (option) => {
    setSelectedPaymentOption(option === selectedPaymentOption ? null : option);
  };

  // Display loading indicator while fetching data
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#037f8c" />
      </View>
    );
  }

  // Display error message if no fee data is found
  if (!feeData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Failed to load fee data.</Text>
      </View>
    );
  }

  // Calculate outstanding fees
  const totalFees = Number(feeData.total_fees) || 0;
  const paidFees = Number(feeData.paid_fees) || 0;
  const outstandingFees = totalFees - paidFees;

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Fee Management</Text>
      </View>

      {/* Fee Summary Section */}
      <View style={styles.feeSummary}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Term Fees</Text>
          <Text style={styles.infoValue}>{totalFees.toLocaleString()} Ksh</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Amount Paid</Text>
          <Text style={styles.infoValue}>{paidFees.toLocaleString()} Ksh</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Outstanding Fee</Text>
          <Text style={styles.infoValue}>{outstandingFees.toLocaleString()} Ksh</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Date Due</Text>
          <Text style={styles.infoValue}>{feeData.due_date || 'N/A'}</Text>
        </View>
      </View>

      {/* Payment Options Section */}
      <View style={styles.paymentSection}>
        <Text style={styles.paymentTitle}>Payment Options</Text>
        <TouchableOpacity
          style={[styles.paymentButton, styles.mpesa]}
          onPress={() => handlePaymentOptionClick('mpesa')}
        >
          <Text style={styles.paymentText}>MPESA PAYBILL</Text>
        </TouchableOpacity>
        {selectedPaymentOption === 'mpesa' && (
          <View style={styles.paymentDetails}>
            <Text style={styles.paymentDetailText}>Paybill Number: 123456</Text>
            <Text style={styles.paymentDetailText}>Account Number: Your Admission Number</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.paymentButton, styles.equityBank]}
          onPress={() => handlePaymentOptionClick('equity')}
        >
          <Text style={styles.paymentText}>Equity Bank</Text>
        </TouchableOpacity>
        {selectedPaymentOption === 'equity' && (
          <View style={styles.paymentDetails}>
            <Text style={styles.paymentDetailText}>Account Number: 987654321</Text>
            <Text style={styles.paymentDetailText}>Branch: Nairobi</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.paymentButton, styles.kcbBank]}
          onPress={() => handlePaymentOptionClick('kcb')}
        >
          <Text style={styles.paymentText}>KCB Bank</Text>
        </TouchableOpacity>
        {selectedPaymentOption === 'kcb' && (
          <View style={styles.paymentDetails}>
            <Text style={styles.paymentDetailText}>Account Number: 123456789</Text>
            <Text style={styles.paymentDetailText}>Branch: Mombasa</Text>
          </View>
        )}
      </View>

      {/* Additional Options */}
      <View style={styles.additionalOptions}>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => toggleSection('transactionHistory')}
        >
          <Text style={styles.dropdownText}>Transaction History</Text>
        </TouchableOpacity>
        {expandedSections.transactionHistory && (
          <View style={styles.dropdownContent}>
            <Text style={styles.dropdownContentText}>Transaction history details go here.</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => toggleSection('yearlySummary')}
        >
          <Text style={styles.dropdownText}>Yearly Summary</Text>
        </TouchableOpacity>
        {expandedSections.yearlySummary && (
          <View style={styles.dropdownContent}>
            <Text style={styles.dropdownContentText}>Yearly summary details go here.</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => toggleSection('feePolicy')}
        >
          <Text style={styles.dropdownText}>Fee Policy</Text>
        </TouchableOpacity>
        {expandedSections.feePolicy && (
          <View style={styles.dropdownContent}>
            <Text style={styles.dropdownContentText}>Fee policy details go here.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
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
  paymentDetails: {
    width: '80%',
    backgroundColor: '#e8f0ff',
    borderRadius: 10,
    padding: 10,
    marginVertical: 5,
  },
  paymentDetailText: {
    fontSize: 14,
    color: '#333',
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
  dropdownContent: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
  },
  dropdownContentText: {
    fontSize: 14,
    color: '#555',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },
});

export default Fee;