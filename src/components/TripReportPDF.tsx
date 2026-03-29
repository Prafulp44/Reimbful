import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { Trip, Expense } from '../types';
import { format } from 'date-fns';

// Register a clean font
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Bold.ttf', fontWeight: 'bold' }
  ]
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 30,
    borderBottom: 2,
    borderBottomColor: '#EA580C',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#171717',
  },
  subtitle: {
    fontSize: 12,
    color: '#737373',
    marginTop: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#171717',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    minHeight: 30,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#F9FAFB',
    fontWeight: 'bold',
  },
  tableCol: {
    width: '25%',
    padding: 5,
  },
  tableCell: {
    fontSize: 10,
    color: '#404040',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTop: 1,
    borderTopColor: '#E5E5E5',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 10,
  },
  totalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#EA580C',
  },
  billImage: {
    width: '100%',
    maxHeight: 400,
    objectFit: 'contain',
    marginBottom: 20,
    borderRadius: 8,
  },
  imagePage: {
    padding: 40,
    alignItems: 'center',
  }
});

interface TripReportPDFProps {
  trip: Trip;
  expenses: Expense[];
}

export default function TripReportPDF({ trip, expenses }: TripReportPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{trip.tripTitle}</Text>
          <Text style={styles.subtitle}>
            Date Range: {format(new Date(trip.startDate), 'MMM d, yyyy')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expense Summary</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <View style={styles.tableCol}><Text style={styles.tableCell}>Category</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>Vendor</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>Date</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>Amount (INR)</Text></View>
            </View>
            {expenses.map((expense) => (
              <View key={expense.id} style={styles.tableRow}>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{expense.category}</Text></View>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{expense.vendorName}</Text></View>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{format(new Date(expense.createdAt), 'MMM d, yyyy')}</Text></View>
                <View style={styles.tableCol}><Text style={styles.tableCell}>₹{expense.amount.toLocaleString('en-IN')}</Text></View>
              </View>
            ))}
          </View>

          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total Reimbursement:</Text>
            <Text style={styles.totalValue}>₹{trip.totalAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {trip.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.tableCell}>{trip.notes}</Text>
          </View>
        )}
      </Page>

      {/* Attached Bills */}
      {expenses.filter(e => e.billImageUrl).map((expense, index) => (
        <Page key={`bill-${index}`} size="A4" style={styles.imagePage}>
          <Text style={[styles.sectionTitle, { marginBottom: 20 }]}>Bill: {expense.vendorName} ({expense.category})</Text>
          <Image src={expense.billImageUrl!} style={styles.billImage} />
          <Text style={styles.subtitle}>Amount: ₹{expense.amount.toLocaleString('en-IN')}</Text>
        </Page>
      ))}
    </Document>
  );
}
