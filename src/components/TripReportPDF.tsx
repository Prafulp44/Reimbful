import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { Trip, Expense } from '../types';
import { format } from 'date-fns';

// Register a clean font
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Bold.ttf', fontWeight: 'bold' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Oblique.ttf', fontStyle: 'italic' }
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
    borderBottomWidth: 2,
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
    borderTopWidth: 1,
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
    maxHeight: 550, // Reduced to ensure amount fits on same page
    objectFit: 'contain',
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  imagePage: {
    padding: 30,
    alignItems: 'center',
  }
});

interface TripReportPDFProps {
  trip: Trip;
  expenses: Expense[];
  category?: string;
}

export function TripSummaryPDF({ trip, expenses, category }: TripReportPDFProps) {
  const categoryTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{trip.tripTitle}{category ? ` - ${category}` : ''}</Text>
          <Text style={styles.subtitle}>
            Date Range: {format(new Date(trip.startDate), 'MMM d, yyyy')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{category ? `${category} ` : ''}Expense Summary</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <View style={styles.tableCol}><Text style={styles.tableCell}>Category</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{category === 'Conveyance' ? 'Mode' : 'Vendor'}</Text></View>
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
            <Text style={styles.totalLabel}>{category ? `${category} ` : ''}Total:</Text>
            <Text style={styles.totalValue}>₹{categoryTotal.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {trip.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.tableCell}>{trip.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}

export function ExpensePagePDF({ expense }: { expense: Expense }) {
  return (
    <Document>
      <Page size="A4" style={styles.imagePage}>
        <View style={{ width: '100%', borderBottomWidth: 1, borderBottomColor: '#E5E5E5', paddingBottom: 10, marginBottom: 15 }}>
          <Text style={styles.sectionTitle}>{expense.category === 'Conveyance' ? 'Mode' : 'Bill'}: {expense.vendorName} ({expense.category})</Text>
          <Text style={styles.subtitle}>Date: {format(new Date(expense.createdAt), 'MMM d, yyyy')}</Text>
        </View>
        
        <Image src={expense.billImageUrl!} style={styles.billImage} />
        
        <View style={{ marginTop: 'auto', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E5E5E5', width: '100%', alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#171717' }}>
            Amount: ₹{expense.amount.toLocaleString('en-IN')}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export function PDFExpenseDetailPagePDF({ expense }: { expense: Expense }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Expense Detail</Text>
          <Text style={styles.subtitle}>
            {expense.category === 'Conveyance' ? 'Mode' : 'Vendor'}: {expense.vendorName}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 12, color: '#404040', marginBottom: 5 }}>Category: {expense.category}</Text>
            <Text style={{ fontSize: 12, color: '#404040', marginBottom: 5 }}>Date: {format(new Date(expense.createdAt), 'MMM d, yyyy')}</Text>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#171717', marginBottom: 5 }}>Amount: ₹{expense.amount.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {expense.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={{ fontSize: 10, color: '#404040' }}>{expense.notes}</Text>
          </View>
        )}

        <View style={{ marginTop: 'auto', alignItems: 'center' }}>
          <Text style={{ fontSize: 10, color: '#A3A3A3', fontStyle: 'italic' }}>
            Please find bill on next page
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// Keep the original component for backward compatibility if needed, 
// but we'll use the sub-components for the new interleaving logic.
export default function TripReportPDF({ trip, expenses }: TripReportPDFProps) {
  return <TripSummaryPDF trip={trip} expenses={expenses} />;
}
