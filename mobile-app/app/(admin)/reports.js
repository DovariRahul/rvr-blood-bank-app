import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import Colors from '../../constants/colors';
import Alert from '../../utils/alert';

export default function ReportsScreen() {
  const [selectedReport, setSelectedReport] = useState(null);

  const reportData = {
    'Monthly Donor Activity': [
      { id: '1', label: 'Total Active Donors', value: '1,245' },
      { id: '2', label: 'New Registrations (This Month)', value: '+142' },
      { id: '3', label: 'Successful Donations', value: '384' },
      { id: '4', label: 'Currently Eligible', value: '890' }
    ],
    'Emergency Match Performance': [
      { id: '1', label: 'Total Emergencies', value: '56' },
      { id: '2', label: 'Average Response Time', value: '14 mins' },
      { id: '3', label: 'Donors Notified', value: '4,200' },
      { id: '4', label: 'Match Success Rate', value: '94%' }
    ],
    'System Audit Log': [
      { id: '1', label: 'Verifications Processed', value: '210' },
      { id: '2', label: 'Rejected Profiles', value: '12' },
      { id: '3', label: 'Manual Overrides', value: '4' },
      { id: '4', label: 'System Uptime', value: '99.9%' }
    ]
  };

  const handleViewReport = (type) => {
    setSelectedReport({ title: type, data: reportData[type] });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>System Report Center</Text>
        <Text style={styles.subtitle}>Select the metrics report you wish to view.</Text>

        <TouchableOpacity style={styles.reportBtn} onPress={() => handleViewReport('Monthly Donor Activity')}>
          <Text style={styles.reportEmoji}>📊</Text>
          <View style={styles.reportInfo}>
            <Text style={styles.reportTitle}>Monthly Donor Activity</Text>
            <Text style={styles.reportDesc}>Tracks active donors, new registrations, and eligibility statuses.</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.reportBtn} onPress={() => handleViewReport('Emergency Match Performance')}>
          <Text style={styles.reportEmoji}>🩸</Text>
          <View style={styles.reportInfo}>
            <Text style={styles.reportTitle}>Emergency Match Performance</Text>
            <Text style={styles.reportDesc}>Analyzes notifications sent, responder times, and success rates.</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.reportBtn} onPress={() => handleViewReport('System Audit Log')}>
          <Text style={styles.reportEmoji}>📜</Text>
          <View style={styles.reportInfo}>
            <Text style={styles.reportTitle}>System Audit Log</Text>
            <Text style={styles.reportDesc}>Detailed timeline of all administrator verification activities.</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Report Modal */}
      <Modal
        visible={!!selectedReport}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedReport(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedReport?.title}</Text>
            
            <View style={styles.metricsContainer}>
              {selectedReport?.data.map((item) => (
                <View key={item.id} style={styles.metricRow}>
                  <Text style={styles.metricLabel}>{item.label}</Text>
                  <Text style={styles.metricValue}>{item.value}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={() => setSelectedReport(null)}
            >
              <Text style={styles.closeBtnText}>Close Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 30,
    textAlign: 'center',
  },
  reportBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  reportEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  reportDesc: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  metricsContainer: {
    marginBottom: 24,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  metricLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  closeBtn: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: Colors.textInverse,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
