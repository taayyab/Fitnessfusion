import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, SHADOWS } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import ScreenWrapper from '../components/ScreenWrapper';

const MONTHS_LABEL = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const PaymentScreen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [currentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('month', { ascending: false });

      setPayments(payData || []);

      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setNotifications(notifData || []);

      // Mark unread notifications as read
      const unread = (notifData || []).filter(n => !n.read).map(n => n.id);
      if (unread.length > 0) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .in('id', unread);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'overdue': return COLORS.red;
      case 'waived': return COLORS.info;
      default: return COLORS.textMuted;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return 'check-circle';
      case 'pending': return 'schedule';
      case 'overdue': return 'error';
      case 'waived': return 'remove-circle';
      default: return 'help';
    }
  };

  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    return `${MONTHS_LABEL[parseInt(month) - 1]} ${year}`;
  };

  const currentPayment = payments.find(p => p.month === currentMonth);
  const pastPayments = payments.filter(p => p.month !== currentMonth);
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Payments</Text>

        {/* Current Month Status */}
        <View style={styles.currentCard}>
          {currentPayment ? (
            <>
              <View style={styles.currentHeader}>
                <View>
                  <Text style={styles.currentLabel}>This Month</Text>
                  <Text style={styles.currentMonth}>{formatMonth(currentMonth)}</Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: getStatusColor(currentPayment.status) + '20' }]}>
                  <MaterialIcons name={getStatusIcon(currentPayment.status)} size={16} color={getStatusColor(currentPayment.status)} />
                  <Text style={[styles.statusChipText, { color: getStatusColor(currentPayment.status) }]}>
                    {currentPayment.status.charAt(0).toUpperCase() + currentPayment.status.slice(1)}
                  </Text>
                </View>
              </View>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Amount</Text>
                <Text style={styles.amountValue}>Rs. {currentPayment.amount.toLocaleString()}</Text>
              </View>
              {currentPayment.due_date && (
                <View style={styles.dueDateRow}>
                  <MaterialIcons name="event" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.dueDateText}>
                    Due: {new Date(currentPayment.due_date).toLocaleDateString()}
                  </Text>
                </View>
              )}
              {currentPayment.paid_date && (
                <View style={styles.dueDateRow}>
                  <MaterialIcons name="check" size={16} color={COLORS.success} />
                  <Text style={[styles.dueDateText, { color: COLORS.success }]}>
                    Paid: {new Date(currentPayment.paid_date).toLocaleDateString()}
                  </Text>
                </View>
              )}
              {currentPayment.notes && (
                <View style={styles.noteBox}>
                  <Text style={styles.noteText}>{currentPayment.notes}</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.noPayment}>
              <MaterialIcons name="payments" size={40} color={COLORS.textMuted} />
              <Text style={styles.noPaymentText}>No payment record for this month</Text>
              <Text style={styles.noPaymentSub}>Your trainer will add it when due</Text>
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <MaterialIcons name="account-balance-wallet" size={22} color={COLORS.success} />
            <Text style={styles.statValue}>Rs. {totalPaid.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Paid</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="pending-actions" size={22} color={COLORS.warning} />
            <Text style={styles.statValue}>Rs. {totalPending.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Notifications / Reminders */}
        {notifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            {notifications.slice(0, 5).map((notif, index) => {
              const isPayment = notif.type === 'payment' || notif.type === 'reminder';
              return (
                <View key={notif.id || index} style={[styles.notifCard, !notif.read && styles.notifUnread]}>
                  <View style={[styles.notifIcon, { backgroundColor: (isPayment ? COLORS.warning : COLORS.info) + '15' }]}>
                    <MaterialIcons
                      name={isPayment ? 'notifications-active' : 'info'}
                      size={20}
                      color={isPayment ? COLORS.warning : COLORS.info}
                    />
                  </View>
                  <View style={styles.notifContent}>
                    <Text style={styles.notifTitle}>{notif.title}</Text>
                    <Text style={styles.notifMessage}>{notif.message}</Text>
                    <Text style={styles.notifTime}>
                      {new Date(notif.created_at).toLocaleDateString()} at{' '}
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Payment History */}
        {pastPayments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            {pastPayments.map((payment, index) => (
              <View key={payment.id || index} style={styles.historyRow}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyMonth}>{formatMonth(payment.month)}</Text>
                  <Text style={styles.historyAmount}>Rs. {payment.amount.toLocaleString()}</Text>
                </View>
                <View style={[styles.historyStatus, { backgroundColor: getStatusColor(payment.status) + '20' }]}>
                  <MaterialIcons name={getStatusIcon(payment.status)} size={14} color={getStatusColor(payment.status)} />
                  <Text style={[styles.historyStatusText, { color: getStatusColor(payment.status) }]}>
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  title: {
    color: COLORS.white,
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    marginBottom: 20,
  },
  currentCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  currentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  currentLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  currentMonth: {
    color: COLORS.white,
    fontSize: SIZES.xl,
    ...FONTS.bold,
    marginTop: 4,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusChipText: {
    fontSize: SIZES.sm,
    ...FONTS.bold,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.cardLight,
    borderRadius: SIZES.radiusSm,
    padding: 16,
    marginBottom: 12,
  },
  amountLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.medium,
  },
  amountValue: {
    color: COLORS.white,
    fontSize: SIZES.xl,
    ...FONTS.bold,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  dueDateText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
  },
  noteBox: {
    backgroundColor: COLORS.cardLight,
    borderRadius: SIZES.radiusSm,
    padding: 12,
    marginTop: 8,
  },
  noteText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.regular,
    fontStyle: 'italic',
  },
  noPayment: {
    alignItems: 'center',
    padding: 20,
  },
  noPaymentText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.medium,
    marginTop: 12,
  },
  noPaymentSub: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    ...FONTS.regular,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    color: COLORS.white,
    fontSize: SIZES.base,
    ...FONTS.bold,
    marginTop: 8,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    ...FONTS.medium,
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
    marginBottom: 12,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  notifUnread: {
    borderColor: COLORS.warning + '40',
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  notifMessage: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.regular,
    marginTop: 4,
    lineHeight: 18,
  },
  notifTime: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
    ...FONTS.regular,
    marginTop: 6,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusSm,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyLeft: {},
  historyMonth: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.semiBold,
  },
  historyAmount: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.regular,
    marginTop: 2,
  },
  historyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  historyStatusText: {
    fontSize: SIZES.xs,
    ...FONTS.bold,
  },
});

export default PaymentScreen;
