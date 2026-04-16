import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Use standard fonts to avoid external loading issues
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#EA580C', // orange-600
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
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EA580C',
    marginBottom: 8,
    marginTop: 10,
  },
  text: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#404040',
    marginBottom: 6,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EA580C',
    borderStyle: 'solid',
  },
  stepNumber: {
    width: 25,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#EA580C',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#171717',
    marginBottom: 4,
  },
  screenshotPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#171717',
    borderStyle: 'solid',
    borderRadius: 12,
    marginTop: 15,
    marginBottom: 15,
  },
  browserHeader: {
    height: 24,
    backgroundColor: '#171717',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    gap: 6,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#404040',
  },
  browserContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFF7ED', // orange-50
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#EA580C',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  placeholderSubtext: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#404040',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 1.4,
  },
  uiElement: {
    marginTop: 12,
    width: 120,
    height: 20,
    backgroundColor: '#EA580C',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uiElementText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    borderStyle: 'solid',
    paddingTop: 10,
    fontSize: 8,
    color: '#A3A3A3',
    textAlign: 'center',
  },
});

const ScreenshotPlaceholder = ({ label, description, buttonLabel }: { label: string, description: string, buttonLabel?: string }) => (
  <View style={styles.screenshotPlaceholder}>
    <View style={styles.browserHeader}>
      <View style={[styles.dot, { backgroundColor: '#FF5F56' }]} />
      <View style={[styles.dot, { backgroundColor: '#FFBD2E' }]} />
      <View style={[styles.dot, { backgroundColor: '#27C93F' }]} />
    </View>
    <View style={styles.browserContent}>
      <Text style={styles.placeholderText}>{label}</Text>
      <Text style={styles.placeholderSubtext}>{description}</Text>
      {buttonLabel && (
        <View style={styles.uiElement}>
          <Text style={styles.uiElementText}>{buttonLabel}</Text>
        </View>
      )}
    </View>
  </View>
);

const SOPPDF = () => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Reimbful SOP</Text>
        <Text style={styles.subtitle}>Standard Operating Procedure for Expense Tracking</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.text}>
          Welcome to Reimbful! This guide will help you navigate the application to efficiently track your travel expenses and generate professional reimbursement reports.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Getting Started</Text>
        
        <View style={styles.stepContainer}>
          <Text style={styles.stepNumber}>01</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Authentication</Text>
            <Text style={styles.text}>
              Open the application and sign up with your full name and a unique username. If you already have an account, simply sign in using your username and password.
            </Text>
            <ScreenshotPlaceholder 
              label="Authentication Screen" 
              description="Secure access to your travel expenses. Sign up with a unique username or log in to your existing account."
              buttonLabel="SIGN IN / SIGN UP"
            />
          </View>
        </View>

        <View style={styles.stepContainer}>
          <Text style={styles.stepNumber}>02</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Dashboard Overview</Text>
            <Text style={styles.text}>
              Once logged in, you'll see your dashboard. This displays all your current and past trips. You can filter trips by their reimbursement status: Pending, Uploaded, or Paid.
            </Text>
            <ScreenshotPlaceholder 
              label="Main Dashboard" 
              description="A central hub for all your travel trips. Use filters to track reimbursement progress."
              buttonLabel="FILTER BY STATUS"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Managing Trips</Text>

        <View style={styles.stepContainer}>
          <Text style={styles.stepNumber}>03</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Creating a New Trip</Text>
            <Text style={styles.text}>
              Click the orange "+" button at the bottom right to create a new trip. Enter the trip title, start date, and end date. This acts as a container for all expenses related to that specific travel.
            </Text>
            <ScreenshotPlaceholder 
              label="Add Trip Modal" 
              description="Define your journey by setting a title and date range. This organizes your receipts."
              buttonLabel="SAVE TRIP"
            />
          </View>
        </View>

        <View style={styles.stepContainer}>
          <Text style={styles.stepNumber}>04</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Adding Expenses</Text>
            <Text style={styles.text}>
              Click "View Details" on any trip card. Inside the trip view, click "Add Expense". Enter the category (Travel, Food, Lodging, Conveyance, Miscellaneous), amount, and date. Most importantly, upload a photo or PDF of your bill.
            </Text>
            <ScreenshotPlaceholder 
              label="Trip Details View" 
              description="Add individual expenses, upload bill images, and see the total trip cost."
              buttonLabel="ADD EXPENSE"
            />
          </View>
        </View>
      </View>

      <Text style={styles.footer}>Reimbful - Professional Expense Management | Page 1</Text>
    </Page>

    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Reports & Profile</Text>

        <View style={styles.stepContainer}>
          <Text style={styles.stepNumber}>05</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Generating PDF Reports</Text>
            <Text style={styles.text}>
              On the dashboard, each trip card has a "Download PDF" button. Clicking this will generate a comprehensive report including a summary page and individual pages for each expense with their attached bills.
            </Text>
            <ScreenshotPlaceholder 
              label="Report Generation" 
              description="Instantly create a professional PDF report with all receipts interleaved for easy submission."
              buttonLabel="DOWNLOAD PDF"
            />
          </View>
        </View>

        <View style={styles.stepContainer}>
          <Text style={styles.stepNumber}>06</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Profile Management</Text>
            <Text style={styles.text}>
              Access your profile by clicking the user icon in the top navigation. Here you can update your name, username, or change your password.
            </Text>
            <ScreenshotPlaceholder 
              label="User Profile" 
              description="Personalize your account and manage security settings."
              buttonLabel="UPDATE PROFILE"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Tips for Success</Text>
        <Text style={styles.text}>• Always upload clear photos of your receipts for faster reimbursement.</Text>
        <Text style={styles.text}>• Keep your trip status updated (Pending → Uploaded → Paid) to track your money flow.</Text>
        <Text style={styles.text}>• Use the search and filter features to quickly find specific trips or expenses.</Text>
      </View>

      <Text style={styles.footer}>Reimbful - Professional Expense Management | Page 2</Text>
    </Page>
  </Document>
);

export default SOPPDF;
