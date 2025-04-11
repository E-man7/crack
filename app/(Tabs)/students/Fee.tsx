import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../../supabase';

const Fee = () => {
  const [feeData, setFeeData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    transactionHistory: false,
    yearlySummary: false,
    feePolicy: false,
  });
  const [selectedPaymentOption, setSelectedPaymentOption] = useState(null);

  // Payment options data
  const paymentOptions = [
    {
      id: 'mpesa',
      name: 'MPESA Paybill',
      icon: 'cellphone',
      color: '#4caf50',
      details: [
        { label: 'Paybill Number', value: '123456' },
        { label: 'Account Number', value: feeData?.adm_no || 'Your Admission No' },
      ]
    },
    {
      id: 'equity',
      name: 'Equity Bank',
      icon: 'bank',
      color: '#d2691e',
      details: [
        { label: 'Account Number', value: '987654321' },
        { label: 'Branch', value: 'Nairobi' },
        { label: 'Account Name', value: 'School Fees Account' },
      ]
    },
    {
      id: 'kcb',
      name: 'KCB Bank',
      icon: 'bank-outline',
      color: '#001f7f',
      details: [
        { label: 'Account Number', value: '123456789' },
        { label: 'Branch', value: 'Mombasa' },
        { label: 'Account Name', value: 'School Fees Account' },
      ]
    }
  ];

  // Fetch fee data from Supabase
  const fetchFeeData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error('Authentication failed: ' + authError.message);

      const { data, error: fetchError } = await supabase
        .from('fees')
        .select('*')
        .eq('adm_no', user.user_metadata.adm_no)
        .maybeSingle();

      if (fetchError) throw new Error('Data fetch failed: ' + fetchError.message);
      if (!data) throw new Error('No fee records found for this student');

      setFeeData(data);
    } catch (err) {
      setError(err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch transaction history when section is expanded
  const fetchTransactions = async () => {
    if (!feeData) return;
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('adm_no', feeData.adm_no)
        .order('date', { ascending: false });
      
      if (!error) setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  useEffect(() => {
    fetchFeeData();
  }, []);

  useEffect(() => {
    if (expandedSections.transactionHistory) {
      fetchTransactions();
    }
  }, [expandedSections.transactionHistory]);

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
        <Text style={styles.loadingText}>Loading fee information...</Text>
      </View>
    );
  }

  // Display error message if no fee data is found
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={50} color="#e74c3c" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchFeeData}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculate outstanding fees
  const totalFees = Number(feeData.total_fees) || 0;
  const paidFees = Number(feeData.paid_fees) || 0;
  const outstandingFees = totalFees - paidFees;
  const paymentProgress = totalFees > 0 ? (paidFees / totalFees) * 100 : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Fee Management</Text>
        <Text style={styles.subHeaderText}>Admission No: {feeData.adm_no}</Text>
      </View>

      {/* Fee Summary Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Fee Summary</Text>
        
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, {width: `${paymentProgress}%`}]} />
        </View>
        
        <View style={styles.progressTextContainer}>
          <Text style={styles.progressText}>Paid: {paidFees.toLocaleString()} Ksh</Text>
          <Text style={styles.progressText}>Total: {totalFees.toLocaleString()} Ksh</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Icon 
            name={outstandingFees > 0 ? 'alert-circle' : 'check-circle'} 
            size={20} 
            color={outstandingFees > 0 ? '#e74c3c' : '#27ae60'} 
          />
          <Text style={[
            styles.outstandingText,
            {color: outstandingFees > 0 ? '#e74c3c' : '#27ae60'}
          ]}>
            {outstandingFees > 0 ? 
              `Outstanding: ${outstandingFees.toLocaleString()} Ksh` : 
              'All fees paid'}
          </Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Icon name="calendar-clock" size={20} color="#037f8c" />
          <Text style={styles.dueDateText}>
            Due Date: {feeData.due_date || 'N/A'}
          </Text>
        </View>
      </View>

      {/* Payment Options Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Payment Options</Text>
        
        {paymentOptions.map((option) => (
          <React.Fragment key={option.id}>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                {backgroundColor: option.color},
                selectedPaymentOption === option.id && styles.selectedOption
              ]}
              onPress={() => handlePaymentOptionClick(option.id)}
            >
              <Icon name={option.icon} size={24} color="#fff" />
              <Text style={styles.paymentText}>{option.name}</Text>
              <Icon 
                name={selectedPaymentOption === option.id ? 'chevron-up' : 'chevron-down'} 
                size={24} 
                color="#fff" 
              />
            </TouchableOpacity>
            
            {selectedPaymentOption === option.id && (
              <View style={styles.paymentDetails}>
                {option.details.map((detail, i) => (
                  <View key={i} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{detail.label}:</Text>
                    <Text style={styles.detailValue}>{detail.value}</Text>
                  </View>
                ))}
                <TouchableOpacity style={styles.copyButton}>
                  <Text style={styles.copyText}>Copy Details</Text>
                </TouchableOpacity>
              </View>
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Transaction History Section */}
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => toggleSection('transactionHistory')}
      >
        <View style={styles.dropdownHeader}>
          <Icon name="history" size={20} color="#2c3e50" />
          <Text style={styles.dropdownText}>Transaction History</Text>
          <Icon 
            name={expandedSections.transactionHistory ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color="#555" 
          />
        </View>
      </TouchableOpacity>

      {expandedSections.transactionHistory && (
        <View style={styles.dropdownContent}>
          {transactions.length > 0 ? (
            transactions.map((txn) => (
              <View key={txn.id} style={styles.transactionItem}>
                <View style={styles.transactionHeader}>
                  <Text style={styles.transactionRef}>{txn.reference}</Text>
                  <Text style={styles.transactionAmount}>
                    +{txn.amount.toLocaleString()} Ksh
                  </Text>
                </View>
                <View style={styles.transactionFooter}>
                  <Text style={styles.transactionDate}>
                    {new Date(txn.date).toLocaleDateString()}
                  </Text>
                  <View style={styles.transactionMethod}>
                    <Icon 
                      name={txn.method === 'mpesa' ? 'cellphone' : 'bank'} 
                      size={14} 
                      color="#7f8c8d" 
                    />
                    <Text style={styles.transactionMethodText}>
                      {txn.method.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No transactions found</Text>
          )}
        </View>
      )}

      {/* Fee Policy Section */}
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => toggleSection('feePolicy')}
      >
        <View style={styles.dropdownHeader}>
          <Icon name="file-document" size={20} color="#2c3e50" />
          <Text style={styles.dropdownText}>Fee Policy</Text>
          <Icon 
            name={expandedSections.feePolicy ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color="#555" 
          />
        </View>
      </TouchableOpacity>

      {expandedSections.feePolicy && (
        <View style={styles.dropdownContent}>
          <Text style={styles.policyText}>
            All fees should be paid by the due date to avoid penalties. A late payment charge of 5% will be applied after the due date.
          </Text>
          <Text style={[styles.policyText, {marginTop: 10}]}>
            For payment issues or queries, please contact the finance office.
          </Text>
          <TouchableOpacity style={styles.contactButton}>
            <Text style={styles.contactText}>Contact Finance Office</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 15,
    color: '#7f8c8d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginVertical: 20,
  },
  retryButton: {
    backgroundColor: '#037f8c',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 10,
  },
  headerContainer: {
    padding: 20,
    backgroundColor: '#037f8c',
    paddingBottom: 15,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subHeaderText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    marginTop: 5,
    opacity: 0.9,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  progressContainer: {
    height: 10,
    backgroundColor: '#ecf0f1',
    borderRadius: 5,
    marginVertical: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#27ae60',
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  progressText: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  outstandingText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
  dueDateText: {
    fontSize: 14,
    color: '#2c3e50',
    marginLeft: 10,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 10,
    marginVertical: 8,
  },
  selectedOption: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  paymentText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 10,
  },
  paymentDetails: {
    backgroundColor: '#f8f9fa',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    padding: 15,
    borderTopWidth: 0,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: '600',
    width: 120,
    color: '#7f8c8d',
  },
  detailValue: {
    flex: 1,
    color: '#2c3e50',
  },
  copyButton: {
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  copyText: {
    color: '#fff',
    fontSize: 14,
  },
  dropdown: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
    marginLeft: 10,
  },
  dropdownContent: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 16,
    marginBottom: 8,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  transactionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  transactionRef: {
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  transactionAmount: {
    color: '#27ae60',
    fontWeight: 'bold',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  transactionDate: {
    color: '#7f8c8d',
    fontSize: 12,
  },
  transactionMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionMethodText: {
    color: '#7f8c8d',
    fontSize: 12,
    marginLeft: 5,
  },
  noDataText: {
    textAlign: 'center',
    color: '#7f8c8d',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  policyText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  contactButton: {
    backgroundColor: '#037f8c',
    padding: 12,
    borderRadius: 5,
    marginTop: 15,
    alignItems: 'center',
  },
  contactText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default Fee;