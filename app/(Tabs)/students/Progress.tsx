import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Dimensions, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Alert,
  AsyncStorage,
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LineChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { PanGestureHandler } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import supabase from '../../supabase';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as MediaLibrary from 'expo-media-library';

const ProgressScreen = () => {
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [subjects, setSubjects] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [targetScores, setTargetScores] = useState({});
  const [subjectTrends, setSubjectTrends] = useState({});
  const [attendance, setAttendance] = useState(null);
  const [isTargetModalVisible, setIsTargetModalVisible] = useState(false);
  const [isSubjectModalVisible, setIsSubjectModalVisible] = useState(false);
  const [isDownloadModalVisible, setIsDownloadModalVisible] = useState(false);
  const [selectedDownloadTerm, setSelectedDownloadTerm] = useState('Term 1');
  const [isDownloading, setIsDownloading] = useState(false);
  const [badges, setBadges] = useState({});
  const [swipeEnabled, setSwipeEnabled] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null); // Add this line
  const terms = ['Term 1', 'Term 2', 'Term 3'];

  // Notification setup
  useEffect(() => {
    const setupNotifications = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Notifications permission not granted');
      }

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      const checkForNewResults = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: latestReport } = await supabase
          .from('reports')
          .select('created_at')
          .eq('adm_no', user.user_metadata.adm_no)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (latestReport) {
          const lastChecked = await AsyncStorage.getItem('lastReportCheck');
          if (!lastChecked || new Date(latestReport.created_at) > new Date(lastChecked)) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'New Results Available!',
                body: 'Your latest academic results have been published.',
              },
              trigger: null,
            });
            await AsyncStorage.setItem('lastReportCheck', new Date().toISOString());
          }
        }
      };

      const interval = setInterval(checkForNewResults, 60 * 60 * 1000);
      return () => clearInterval(interval);
    };

    setupNotifications();
  }, []);

  // Fetch all data for the selected term
  const fetchTermData = async (term) => {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('adm_no', user.user_metadata.adm_no)
        .single();

      if (studentError) throw studentError;

      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .eq('adm_no', user.user_metadata.adm_no)
        .eq('period', term);

      if (reportsError) throw reportsError;

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('adm_no', user.user_metadata.adm_no)
        .eq('term', term);

      const uniqueSubjects = [...new Set(reportsData.map(report => report.report_type))];

      // Calculate trends for all subjects
      const trends = {};
      for (const subject of uniqueSubjects) {
        const analysis = await fetchSubjectAnalysis(subject);
        if (analysis) {
          trends[subject] = analysis;
        }
      }
      setSubjectTrends(trends);

      setUserData({
        student: studentData,
        reports: reportsData,
      });
      setSubjects(uniqueSubjects);
      setReports(reportsData);
      if (!attendanceError) setAttendance(attendanceData[0]);

      setChartData({
        labels: uniqueSubjects,
        datasets: [
          {
            data: uniqueSubjects.map(subject => {
              const report = reportsData.find(r => r.report_type === subject);
              return report ? report.score : 0;
            }),
            color: (opacity = 1) => `rgba(74, 111, 165, ${opacity})`,
            strokeWidth: 2,
          },
        ],
      });
    } catch (error) {
      console.error('Error fetching term data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate badges when reports change
  useEffect(() => {
    if (reports.length > 0) {
      const newBadges = {};
      reports.forEach(report => {
        if (report.score >= 90) {
          newBadges[report.report_type] = `${report.report_type} Master`;
        } else if (report.score >= 80) {
          newBadges[report.report_type] = `${report.report_type} Expert`;
        } else if (report.score >= 70) {
          newBadges[report.report_type] = `${report.report_type} Achiever`;
        }
      });
      setBadges(newBadges);
    }
  }, [reports]);

  // Fetch data when term changes
  useEffect(() => {
    fetchTermData(selectedTerm);
  }, [selectedTerm]);

  // Fetch subject analysis across all terms
  const fetchSubjectAnalysis = async (subjectName) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .eq('adm_no', user.user_metadata.adm_no)
        .eq('report_type', subjectName)
        .order('period', { ascending: true });

      if (reportsError) throw reportsError;

      const scoresByTerm = reportsData.map(report => ({
        term: report.period,
        score: report.score,
      }));

      const averageScore = scoresByTerm.length > 0 
        ? scoresByTerm.reduce((sum, report) => sum + report.score, 0) / scoresByTerm.length
        : 0;

      // Calculate trend
      let trend = null;
      if (scoresByTerm.length >= 2) {
        const lastScore = scoresByTerm[scoresByTerm.length - 1].score;
        const prevScore = scoresByTerm[scoresByTerm.length - 2].score;
        trend = lastScore - prevScore;
      }

      return {
        subject_name: subjectName,
        scoresByTerm,
        averageScore,
        trend
      };
    } catch (error) {
      console.error('Error fetching subject analysis:', error);
      return null;
    }
  };

  // Handle swipe gestures
  const onSwipe = ({ nativeEvent }) => {
    if (!swipeEnabled) return;
    
    const { translationX } = nativeEvent;
    if (translationX < -50) {
      const currentIndex = terms.indexOf(selectedTerm);
      if (currentIndex < terms.length - 1) {
        setSelectedTerm(terms[currentIndex + 1]);
      }
    } else if (translationX > 50) {
      const currentIndex = terms.indexOf(selectedTerm);
      if (currentIndex > 0) {
        setSelectedTerm(terms[currentIndex - 1]);
      }
    }
  };

  // Get trend indicator for a subject
  const getTrendIndicator = (subject) => {
    const trendData = subjectTrends[subject];
    if (!trendData || trendData.trend === null) return null;
    
    const difference = trendData.trend;
    
    if (difference > 0) {
      return <Text style={styles.trendUp}>↑ {Math.abs(difference)}%</Text>;
    } else if (difference < 0) {
      return <Text style={styles.trendDown}>↓ {Math.abs(difference)}%</Text>;
    }
    return <Text style={styles.trendNeutral}>→ 0%</Text>;
  };

  // Handle export
  const handleExport = async (format) => {
    setIsDownloading(true);
    try {
      // Get the data for the selected download term
      const { data: { user } } = await supabase.auth.getUser();
      const { data: downloadReports } = await supabase
        .from('reports')
        .select('*')
        .eq('adm_no', user.user_metadata.adm_no)
        .eq('period', selectedDownloadTerm);

      const { data: downloadAttendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('adm_no', user.user_metadata.adm_no)
        .eq('term', selectedDownloadTerm);

      // Create HTML content for PDF
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #4A6FA5; text-align: center; }
              h2 { color: #2C3E50; margin-top: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th { background-color: #4A6FA5; color: white; padding: 10px; text-align: left; }
              td { padding: 8px; border-bottom: 1px solid #ddd; }
              .good { color: #28B463; }
              .average { color: #F39C12; }
              .poor { color: #E74C3C; }
              .footer { margin-top: 30px; font-size: 12px; color: #7F8C8D; text-align: center; }
            </style>
          </head>
          <body>
            <h1>Academic Report - ${selectedDownloadTerm}</h1>
            <h2>Student Information</h2>
            <p><strong>Name:</strong> ${userData?.student?.name}</p>
            <p><strong>Admission No:</strong> ${userData?.student?.adm_no}</p>
            
            <h2>Subject Performance</h2>
            <table>
              <tr>
                <th>Subject</th>
                <th>Score</th>
                <th>Target</th>
                <th>Trend</th>
              </tr>
              ${downloadReports?.map(report => `
                <tr>
                  <td>${report.report_type}</td>
                  <td class="${report.score >= 70 ? 'good' : report.score >= 50 ? 'average' : 'poor'}">
                    ${report.score}%
                  </td>
                  <td>${targetScores[report.report_type] || 'N/A'}</td>
                  <td>
                    ${subjectTrends[report.report_type]?.trend > 0 ? '↑' : 
                      subjectTrends[report.report_type]?.trend < 0 ? '↓' : '→'}
                    ${subjectTrends[report.report_type]?.trend ? 
                      Math.abs(subjectTrends[report.report_type].trend) + '%' : 'N/A'}
                  </td>
                </tr>
              `).join('')}
            </table>
            
            ${downloadAttendance?.[0] ? `
              <h2>Attendance</h2>
              <p>Present: ${downloadAttendance[0].attendance} days</p>
              <p>Total: ${downloadAttendance[0].total_days} days</p>
              <p>Rate: ${((downloadAttendance[0].attendance / downloadAttendance[0].total_days) * 100).toFixed(1)}%</p>
            ` : ''}
            
            <div class="footer">
              <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>
          </body>
        </html>
      `;

      if (format === 'pdf') {
        // Generate and save PDF
        const { uri } = await Print.printToFileAsync({
          html: htmlContent,
          width: 612, // 8.5 inches in points
          height: 792, // 11 inches in points
        });

        // Request media library permissions
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          const asset = await MediaLibrary.createAssetAsync(uri);
          await MediaLibrary.createAlbumAsync('Reports', asset, false);
          Alert.alert(
            'PDF Saved',
            `The report has been saved to your device's media library.`,
            [{ text: 'OK', onPress: () => setIsDownloadModalVisible(false) }]
          );
        } else {
          Alert.alert(
            'PDF Generated',
            `The report has been generated but couldn't be saved to your gallery.`,
            [
              { text: 'View', onPress: () => Sharing.shareAsync(uri) },
              { text: 'OK', onPress: () => setIsDownloadModalVisible(false) }
            ]
          );
        }
      } else {
        // Generate CSV
        let csvContent = 'Subject,Score,Target,Trend\n';
        downloadReports?.forEach(report => {
          const trend = subjectTrends[report.report_type]?.trend;
          const trendSymbol = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';
          const trendValue = trend ? `${trendSymbol} ${Math.abs(trend)}%` : 'N/A';
          
          csvContent += `${report.report_type},${report.score},${targetScores[report.report_type] || 'N/A'},${trendValue}\n`;
        });

        if (downloadAttendance?.[0]) {
          csvContent += `\nAttendance,${downloadAttendance[0].attendance},${downloadAttendance[0].total_days},${((downloadAttendance[0].attendance / downloadAttendance[0].total_days) * 100).toFixed(1)}%`;
        }

        const uri = `${FileSystem.documentDirectory}report_${selectedDownloadTerm}.csv`;
        await FileSystem.writeAsStringAsync(uri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        Alert.alert(
          'CSV Saved',
          `The report has been saved as CSV.`,
          [
            { text: 'Share', onPress: () => Sharing.shareAsync(uri) },
            { text: 'OK', onPress: () => setIsDownloadModalVisible(false) }
          ]
        );
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      Alert.alert('Error', `Failed to export ${format.toUpperCase()}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // Render goal setting modal
  const renderGoalSettingModal = () => (
    <Modal visible={isTargetModalVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Set Target Scores</Text>
          <ScrollView style={styles.modalScrollView}>
            {subjects.map(subject => (
              <View key={subject} style={styles.modalRow}>
                <Text style={styles.modalLabel}>{subject}</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Target"
                  keyboardType="numeric"
                  onChangeText={(text) => setTargetScores(prev => ({
                    ...prev,
                    [subject]: text
                  }))}
                  value={targetScores[subject]?.toString() || ''}
                />
              </View>
            ))}
          </ScrollView>
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]}
              onPress={() => {
                setIsTargetModalVisible(false);
                Alert.alert('Success', 'Target scores saved');
              }}
            >
              <Text style={styles.buttonText}>Save Targets</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setIsTargetModalVisible(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Render subject analysis modal
  const renderSubjectAnalysisModal = () => (
    <Modal visible={isSubjectModalVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{selectedSubject?.subject_name} Analysis</Text>
          <ScrollView style={styles.modalScrollView}>
            <Text style={styles.sectionTitle}>Performance by Term:</Text>
            {selectedSubject?.scoresByTerm.map((term, index) => (
              <View key={index} style={styles.termRow}>
                <Text style={styles.termLabel}>{term.term}:</Text>
                <Text style={styles.termScore}>{term.score}%</Text>
              </View>
            ))}
            <Text style={styles.averageScore}>
              Average Score: {selectedSubject?.averageScore.toFixed(1)}%
            </Text>
          </ScrollView>
          <TouchableOpacity 
            style={[styles.modalButton, styles.closeButton]}
            onPress={() => setIsSubjectModalVisible(false)}
          >
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Render download modal
  const renderDownloadModal = () => (
    <Modal visible={isDownloadModalVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Export Report</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedDownloadTerm}
              onValueChange={setSelectedDownloadTerm}
              style={styles.picker}
              dropdownIconColor="#4A6FA5"
            >
              {terms.map(term => (
                <Picker.Item key={term} label={term} value={term} />
              ))}
            </Picker>
          </View>
          {isDownloading ? (
            <View style={styles.downloadingContainer}>
              <ActivityIndicator size="large" color="#4A6FA5" />
              <Text style={styles.downloadingText}>Generating report...</Text>
            </View>
          ) : (
            <View style={styles.exportButtonsContainer}>
              <TouchableOpacity 
                style={[styles.exportButton, styles.pdfButton]}
                onPress={() => handleExport('pdf')}
              >
                <Icon name="picture-as-pdf" size={20} color="#fff" />
                <Text style={styles.exportButtonText}>Export as PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.exportButton, styles.csvButton]}
                onPress={() => handleExport('csv')}
              >
                <Icon name="grid-on" size={20} color="#fff" />
                <Text style={styles.exportButtonText}>Export as CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.exportButton, styles.cancelExportButton]}
                onPress={() => setIsDownloadModalVisible(false)}
              >
                <Text style={styles.exportButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A6FA5" />
        <Text style={styles.loadingText}>Loading {selectedTerm} data...</Text>
      </View>
    );
  }

  return (
    <PanGestureHandler onGestureEvent={onSwipe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Academic Progress</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => setIsDownloadModalVisible(true)}
            >
              <Icon name="download" size={24} color="#4A6FA5" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => setIsTargetModalVisible(true)}
            >
              <Icon name="flag" size={24} color="#4A6FA5" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Term Selector */}
        <View style={styles.termSelectorContainer}>
          <Text style={styles.sectionLabel}>Select Term</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedTerm}
              onValueChange={setSelectedTerm}
              style={styles.picker}
              dropdownIconColor="#4A6FA5"
            >
              {terms.map(term => (
                <Picker.Item 
                  key={term} 
                  label={term} 
                  value={term} 
                  style={styles.pickerItem}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Performance Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Performance Overview</Text>
            <Text style={styles.termBadge}>{selectedTerm}</Text>
          </View>
          {chartData && (
            <LineChart
              data={chartData}
              width={Dimensions.get('window').width - 40}
              height={220}
              yAxisLabel=""
              yAxisSuffix="%"
              chartConfig={{
                backgroundColor: '#FFFFFF',
                backgroundGradientFrom: '#FFFFFF',
                backgroundGradientTo: '#FFFFFF',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(74, 111, 165, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: 5,
                  strokeWidth: 2,
                  stroke: '#4A6FA5',
                },
                propsForLabels: {
                  fontSize: 10,
                },
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 12,
                paddingRight: 58,
              }}
            />
          )}
        </View>

        {/* Subjects Card */}
        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={styles.cardTitle}>Subject Performance</Text>
          
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { flex: 2, textAlign: 'left' }]}>Subject</Text>
            <Text style={styles.headerCell}>Score</Text>
            <Text style={styles.headerCell}>Target</Text>
            <Text style={styles.headerCell}>Trend</Text>
          </View>
          
          <ScrollView style={styles.tableScroll}>
            {subjects.length > 0 ? (
              subjects.map((subject, index) => {
                const report = reports.find(r => r.report_type === subject);
                return (
                  <TouchableOpacity
                    key={`${subject}-${index}`}
                    style={[
                      styles.tableRow,
                      index % 2 === 0 ? styles.evenRow : styles.oddRow
                    ]}
                    onPress={async () => {
                      const analysis = await fetchSubjectAnalysis(subject);
                      setSelectedSubject(analysis);
                      setIsSubjectModalVisible(true);
                    }}
                  >
                    <View style={{ flex: 2 }}>
                      <Text style={[styles.cell, { textAlign: 'left', fontWeight: '500' }]}>{subject}</Text>
                      {badges[subject] && (
                        <Text style={styles.badge}>{badges[subject]}</Text>
                      )}
                    </View>
                    <View style={styles.scoreContainer}>
                      <Text style={[styles.cell, { 
                        color: report?.score >= 70 ? '#28B463' : report?.score >= 50 ? '#F39C12' : '#E74C3C',
                        fontWeight: '600'
                      }]}>
                        {report ? `${report.score}%` : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.targetContainer}>
                      <Text style={styles.cell}>
                        {targetScores[subject] || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.trendContainer}>
                      {getTrendIndicator(subject)}
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.noDataContainer}>
                <Icon name="error-outline" size={24} color="#7F8C8D" />
                <Text style={styles.noDataText}>No data available for {selectedTerm}</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Attendance Card */}
        {attendance && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Attendance Summary</Text>
            <View style={styles.attendanceContent}>
              <View style={styles.attendanceStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{attendance.attendance}</Text>
                  <Text style={styles.statLabel}>Days Present</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{attendance.total_days}</Text>
                  <Text style={styles.statLabel}>Total Days</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#4A6FA5' }]}>
                    {((attendance.attendance / attendance.total_days) * 100).toFixed(1)}%
                  </Text>
                  <Text style={styles.statLabel}>Attendance Rate</Text>
                </View>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View style={{
                    width: `${(attendance.attendance / attendance.total_days) * 100}%`,
                    height: '100%',
                    backgroundColor: '#4A6FA5',
                    borderRadius: 5,
                  }} />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Modals */}
        {renderGoalSettingModal()}
        {renderSubjectAnalysisModal()}
        {renderDownloadModal()}
      </View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4A6FA5',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
  },
  headerActions: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 16,
    padding: 8,
  },
  termSelectorContainer: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  pickerWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  picker: {
    width: '100%',
    height: 50,
    color: '#2C3E50',
  },
  pickerItem: {
    fontSize: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  termBadge: {
    backgroundColor: '#EAF2F8',
    color: '#4A6FA5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEDED',
    marginBottom: 8,
  },
  headerCell: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
    flex: 1,
    textAlign: 'center',
  },
  tableScroll: {
    maxHeight: 300,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FA',
  },
  evenRow: {
    backgroundColor: '#FFFFFF',
  },
  oddRow: {
    backgroundColor: '#F9FAFC',
  },
  cell: {
    fontSize: 14,
    color: '#2C3E50',
    textAlign: 'center',
  },
  scoreContainer: {
    flex: 1,
    alignItems: 'center',
  },
  targetContainer: {
    flex: 1,
    alignItems: 'center',
  },
  trendContainer: {
    flex: 1,
    alignItems: 'center',
  },
  badge: {
    fontSize: 12,
    color: '#4A6FA5',
    backgroundColor: '#EAF2F8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  trendUp: {
    color: '#28B463',
    fontSize: 14,
    fontWeight: '600',
  },
  trendDown: {
    color: '#E74C3C',
    fontSize: 14,
    fontWeight: '600',
  },
  trendNeutral: {
    color: '#7F8C8D',
    fontSize: 14,
    fontWeight: '600',
  },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 10,
    textAlign: 'center',
  },
  attendanceContent: {
    marginTop: 10,
  },
  attendanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressBarContainer: {
    marginTop: 5,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#EAEDED',
    borderRadius: 4,
    overflow: 'hidden',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalScrollView: {
    marginBottom: 20,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalLabel: {
    flex: 1,
    color: '#2C3E50',
    fontSize: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D6DBDF',
    borderRadius: 8,
    padding: 12,
    width: 100,
    textAlign: 'center',
    fontSize: 16,
    color: '#2C3E50',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
    flexDirection: 'row',
  },
  saveButton: {
    backgroundColor: '#4A6FA5',
  },
  cancelButton: {
    backgroundColor: '#7F8C8D',
  },
  closeButton: {
    backgroundColor: '#4A6FA5',
    width: '100%',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 16,
    color: '#2C3E50',
    marginBottom: 12,
  },
  termRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 8,
  },
  termLabel: {
    color: '#2C3E50',
    fontSize: 16,
  },
  termScore: {
    fontWeight: '600',
    color: '#4A6FA5',
    fontSize: 16,
  },
  averageScore: {
    fontWeight: '600',
    marginTop: 16,
    color: '#28B463',
    fontSize: 18,
    textAlign: 'center',
  },
  downloadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  downloadingText: {
    marginTop: 10,
    color: '#7F8C8D',
  },
  exportButtonsContainer: {
    marginTop: 16,
  },
  exportButton: {
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  pdfButton: {
    backgroundColor: '#E74C3C',
  },
  csvButton: {
    backgroundColor: '#28B463',
  },
  cancelExportButton: {
    backgroundColor: '#7F8C8D',
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  subjectAnalysisContainer: {
    padding: 16,
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  analysisSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  performanceChartContainer: {
    height: 200,
    marginVertical: 16,
  },
  performanceMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  metricCard: {
    backgroundColor: '#F5F7FA',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '30%',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A6FA5',
  },
  metricLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
});

export default ProgressScreen;