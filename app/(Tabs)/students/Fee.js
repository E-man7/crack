import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator  , Image, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import supabase from '../../supabase';
import * as Clipboard from 'expo-clipboard';

// Payment provider color mapping
const PAYMENT_PROVIDER_COLORS = {
  // Kenyan Banks
  'EQUITY': '#00AAE4',
  'KCB': '#D21034',
  'CO-OPERATIVE BANK': '#004A83',
  'COOP': '#004A83',
  'STANDARD CHARTERED': '#0033A0',
  'BARCLAYS': '#00AEEF',
  'NCBA': '#E31937',
  'DTB': '#FFCD00',
  'ABSA': '#FF0000',
  'STANBIC': '#0033A0',
  'CBA': '#0056A3',
  'I&M': '#E4002B',
  'HFC': '#006838',
  
  // Mobile Money
  'M-PESA': '#00A95C',
  'AIRTEL MONEY': '#E21836',
  'T-KASH': '#FFC72C',
  'T-KASH BY SAFARICOM': '#FFC72C',
  
  // International Providers
  'PAYPAL': '#003087',
  'VISA': '#1A1F71',
  'MASTERCARD': '#EB001B',
  
  // Defaults
  'DEFAULT_BANK': '#d2691e',
  'DEFAULT_MOBILE': '#4caf50'
};

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
  const [paymentOptions, setPaymentOptions] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [schoolId, setSchoolId] = useState(null);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error('Authentication failed: ' + authError.message);
  
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('adm_no', user.user_metadata.adm_no)
        .maybeSingle();
  
      if (studentError) throw new Error('Student data fetch failed: ' + studentError.message);
      if (!studentData) throw new Error('No student records found');
  
      let schoolData = null;
      if (studentData.school_id) {
        const { data: school, error: schoolError } = await supabase
          .from('schools')
          .select('fee_policy, contact_info')
          .eq('id', studentData.school_id)
          .maybeSingle();
  
        if (schoolError) console.error('School data fetch error:', schoolError.message);
        schoolData = school;
      }
  
      setSchoolId(studentData.school_id || null); // Add this line
      setSchoolInfo(schoolData || null);
      return studentData;
    } catch (err) {
      setError(err.message);
      console.error('Error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeData = async () => {
    try {
      setLoading(true);
      const studentData = await fetchStudentData();
      if (!studentData) return;

      const { data, error: fetchError } = await supabase
        .from('fees')
        .select('*')
        .eq('adm_no', studentData.adm_no)
        .maybeSingle();

      if (fetchError) throw new Error('Fee data fetch failed: ' + fetchError.message);
      if (!data) throw new Error('No fee records found for this student');

      setFeeData(data);
    } catch (err) {
      setError(err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentOptions = async () => {
    if (!schoolId) return;

    try {
      setLoading(true);
      
      const [
        { data: bankAccounts, error: bankError },
        { data: mobilePayments, error: mobileError }
      ] = await Promise.all([
        supabase
          .from('school_bank_accounts')
          .select('*')
          .eq('school_id', schoolId),
        supabase
          .from('school_mobile_payments')
          .select('*')
          .eq('school_id', schoolId)
      ]);

      if (bankError) throw new Error(`Bank accounts: ${bankError.message}`);
      if (mobileError) throw new Error(`Mobile payments: ${mobileError.message}`);

      const options = [];

      // Add bank accounts with brand-specific colors
      bankAccounts?.forEach(account => {
        const bankName = account.bank_name.toUpperCase().trim();
        const brandColor = PAYMENT_PROVIDER_COLORS[bankName] || 
                          PAYMENT_PROVIDER_COLORS.DEFAULT_BANK;
        
        options.push({
          id: `bank_${account.id}`,
          type: 'bank',
          name: account.bank_name,
          icon: 'bank',
          color: brandColor,
          is_primary: account.is_primary,
          details: [
            { label: 'Account Name', value: account.account_name },
            { label: 'Account Number', value: account.account_number },
            { label: 'Branch', value: account.branch || 'Main Branch' },
          ]
        });
      });

      // Add mobile payments with brand-specific colors
      mobilePayments?.forEach(payment => {
        const providerName = payment.provider.toUpperCase().trim();
        const brandColor = PAYMENT_PROVIDER_COLORS[providerName] || 
                          PAYMENT_PROVIDER_COLORS.DEFAULT_MOBILE;
        
        options.push({
          id: `mobile_${payment.id}`,
          type: 'mobile',
          name: `${payment.provider} Paybill`,
          icon: payment.provider === 'M-PESA' ? 'cellphone' : 'cellphone-message',
          color: brandColor,
          is_primary: payment.is_primary,
          details: [
            { label: 'Paybill Number', value: payment.paybill_number },
            { label: 'Account Reference', 
              value: payment.account_reference || feeData?.adm_no || 'Your Admission No' 
            },
          ]
        });
      });

      setPaymentOptions(options.sort((a, b) => (b.is_primary - a.is_primary)));
    } catch (err) {
      console.error('Error fetching payment options:', err);
      setError('Failed to load payment options. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (details) => {
    try {
      const textToCopy = details.map(d => `${d.label}: ${d.value}`).join('\n');
      Clipboard.setString(textToCopy);  // This is the updated API
      
      Toast.show({
        type: 'success',
        text1: 'Copied to clipboard',
        text2: 'Payment details are ready to paste',
        visibilityTime: 2000,
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      Toast.show({
        type: 'error',
        text1: 'Copy failed',
        text2: 'Could not copy payment details',
      });
    }
  };

  const fetchTransactions = async () => {
    if (!feeData) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('adm_no', feeData.adm_no)
        .order('date', { ascending: false });
      
      if (!error) setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handlePaymentOptionClick = (option) => {
    setSelectedPaymentOption(option === selectedPaymentOption ? null : option);
  };

  useEffect(() => {
    fetchFeeData();
  }, []);

  useEffect(() => {
    if (schoolId && feeData) {
      fetchPaymentOptions();
    }
  }, [schoolId, feeData]); 

  useEffect(() => {
    if (expandedSections.transactionHistory) {
      fetchTransactions();
    }
  }, [expandedSections.transactionHistory]);

  const handleContactPress = () => {
    if (!schoolInfo?.contact_info) return;
    
    // Check if contact info is a phone number
    if (/^[\d\s+]+$/.test(schoolInfo.contact_info)) {
      const phoneNumber = schoolInfo.contact_info.replace(/[^\d+]/g, '');
      Linking.openURL(`tel:${phoneNumber}`);
    } 
    // Check if it's an email
    else if (schoolInfo.contact_info.includes('@')) {
      Linking.openURL(`mailto:${schoolInfo.contact_info}`);
    }
    // Otherwise just show it as text
    else {
      Toast.show({
        type: 'info',
        text1: 'Contact Information',
        text2: schoolInfo.contact_info,
      });
    }
  };

  if (loading && !feeData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#037f8c" />
        <Text style={styles.loadingText}>Loading fee information...</Text>
      </View>
    );
  }

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

  const totalFees = Number(feeData?.total_fees) || 0;
  const paidFees = Number(feeData?.paid_fees) || 0;
  const outstandingFees = totalFees - paidFees;
  const paymentProgress = totalFees > 0 ? (paidFees / totalFees) * 100 : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Fee Management</Text>
        <Text style={styles.subHeaderText}>Admission No: {feeData?.adm_no || 'N/A'}</Text>
      </View>

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
            Due Date: {feeData?.due_date || 'N/A'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Payment Options</Text>
        
        {loading && paymentOptions.length === 0 ? (
          <ActivityIndicator size="small" color="#037f8c" />
        ) : paymentOptions.length > 0 ? (
          paymentOptions.map((option) => (
            <React.Fragment key={option.id}>
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  {backgroundColor: option.color},
                  selectedPaymentOption === option.id && styles.selectedOption
                ]}
                onPress={() => handlePaymentOptionClick(option.id)}
              >
                <View style={styles.paymentOptionLeft}>
                {option.type === 'mobile' && option.name.includes('M-PESA') && (
                  <Image 
                    source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/1200px-M-PESA_LOGO-01.svg.png' }}
                    style={styles.providerLogo}
                  />
                )}
                {option.type === 'bank' && option.name.includes('Equity') && (
                  <Image 
                    source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Equity_Bank_%28Kenya%29_Logo.svg/1200px-Equity_Bank_%28Kenya%29_Logo.svg.png' }}
                    style={styles.providerLogo}
                  />
                )}
                {!option.name.includes('M-PESA') && !option.name.includes('Equity') && (
                  <Icon 
                    name={option.icon} 
                    size={24} 
                    color="#fff" 
                    style={styles.paymentIcon} 
                  />
                )}
                  <Text style={styles.paymentText}>{option.name}</Text>
                </View>
                <View style={styles.paymentOptionRight}>
                  {option.is_primary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                    </View>
                  )}
                  <Icon 
                    name={selectedPaymentOption === option.id ? 'chevron-up' : 'chevron-down'} 
                    size={24} 
                    color="#fff" 
                  />
                </View>
              </TouchableOpacity>
              
              {selectedPaymentOption === option.id && (
                <View style={styles.paymentDetails}>
                  {option.details.map((detail, i) => (
                    <View key={i} style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{detail.label}:</Text>
                      <Text style={styles.detailValue}>{detail.value}</Text>
                      <TouchableOpacity 
                        onPress={() => copyToClipboard([detail])}
                        style={styles.copyIcon}
                      >
                        <Icon name="content-copy" size={16} color="#3498db" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity 
                    style={styles.copyButton}
                    onPress={() => copyToClipboard(option.details)}
                  >
                    <Text style={styles.copyText}>Copy All Details</Text>
                  </TouchableOpacity>
                </View>
              )}
            </React.Fragment>
          ))
        ) : (
          <View style={styles.noPaymentOptions}>
            <Icon name="alert-circle-outline" size={30} color="#7f8c8d" />
            <Text style={styles.noPaymentOptionsText}>No payment options available</Text>
          </View>
        )}
      </View>

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
          {loading ? (
            <ActivityIndicator size="small" color="#037f8c" />
          ) : transactions.length > 0 ? (
            transactions.map((txn) => (
              <View key={txn.id} style={styles.transactionItem}>
                <View style={styles.transactionHeader}>
                  <Text style={styles.transactionRef}>{txn.reference}</Text>
                  <Text style={styles.transactionAmount}>
                    +{txn.amount?.toLocaleString() || '0'} Ksh
                  </Text>
                </View>
                <View style={styles.transactionFooter}>
                  <Text style={styles.transactionDate}>
                    {txn.date ? new Date(txn.date).toLocaleDateString() : 'N/A'}
                  </Text>
                  <View style={styles.transactionMethod}>
                    <Icon 
                      name={txn.method === 'mpesa' ? 'cellphone' : 'bank'} 
                      size={14} 
                      color="#7f8c8d" 
                    />
                    <Text style={styles.transactionMethodText}>
                      {txn.method?.toUpperCase() || 'UNKNOWN'}
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
    {schoolInfo?.fee_policy ? (
      <Text style={styles.policyText}>{schoolInfo.fee_policy}</Text>
    ) : (
      <View style={styles.noPolicyContainer}>
        <Icon name="information-outline" size={24} color="#7f8c8d" />
        <Text style={styles.noPolicyText}>
          No fee policy available. Please contact the school for more information.
        </Text>
      </View>
    )}
    
    {schoolInfo?.contact_info && (
      <TouchableOpacity 
        style={styles.contactButton}
        onPress={handleContactPress}
      >
        <View style={styles.contactButtonContent}>
          <Icon name="email" size={18} color="#fff" style={styles.contactIcon} />
          <View>
            <Text style={styles.contactText}>Contact Finance Office</Text>
            <Text style={styles.contactDetailText}>
              {schoolInfo.contact_info}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )}
  </View>
)}

<Toast />
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
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIcon: {
    marginRight: 10,
  },
  paymentText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryBadge: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 10,
  },
  primaryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
    alignItems: 'center',
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
  copyIcon: {
    marginLeft: 10,
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
  noPaymentOptions: {
    alignItems: 'center',
    padding: 20,
  },
  noPaymentOptionsText: {
    marginTop: 10,
    color: '#7f8c8d',
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
  providerLogo: {
    width: 24,
    height: 24,
    marginRight: 10,
    resizeMode: 'contain'
  },
  noPolicyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 15,
  },
  noPolicyText: {
    marginLeft: 10,
    color: '#7f8c8d',
    flex: 1,
  },
  contactButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIcon: {
    marginRight: 12,
  },
  contactDetailText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
});

export default Fee;