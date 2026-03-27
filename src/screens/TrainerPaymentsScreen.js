import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, SHADOWS } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import { sendPushNotification, sendBulkPushNotifications } from '../utils/notifications';
import GradientButton from '../components/GradientButton';
import ScreenWrapper from '../components/ScreenWrapper';
import { showAlert } from '../components/ThemedAlert';

const MONTHS_LABEL = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TrainerPaymentsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('status');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [amount, setAmount] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [paymentTab, setPaymentTab] = useState('unpaid'); // 'paid' | 'unpaid'

  const currentMonth = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: membersData } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'member')
        .order('full_name', { ascending: true });

      setMembers(membersData || []);

      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .order('month', { ascending: false });

      setPayments(paymentsData || []);

      // Auto-reset: check for paid payments older than 30 days
      await autoResetExpiredPayments(paymentsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-reset payments that were paid more than 30 days ago
  const autoResetExpiredPayments = async (allPayments) => {
    const now = new Date();
    const expiredPaid = allPayments.filter(p => {
      if (p.status !== 'paid' || !p.paid_date) return false;
      const paidDate = new Date(p.paid_date);
      const diffDays = Math.floor((now - paidDate) / (1000 * 60 * 60 * 24));
      return diffDays >= 30;
    });

    for (const payment of expiredPaid) {
      // Create new month entry as pending
      const paidDate = new Date(payment.paid_date);
      const nextMonth = new Date(paidDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

      // Check if next month payment already exists
      const exists = allPayments.find(p => p.user_id === payment.user_id && p.month === nextMonthStr);
      if (!exists) {
        const dueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 7);
        await supabase.from('payments').insert({
          user_id: payment.user_id,
          amount: payment.amount,
          month: nextMonthStr,
          status: 'pending',
          due_date: dueDate.toISOString().split('T')[0],
          updated_by: user?.id,
        });
      }
    }

    // Mark overdue: pending payments past due date by 5+ days
    const overduePayments = allPayments.filter(p => {
      if (p.status !== 'pending' || !p.due_date) return false;
      const dueDate = new Date(p.due_date);
      const diffDays = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
      return diffDays >= 5;
    });

    for (const payment of overduePayments) {
      await supabase
        .from('payments')
        .update({ status: 'overdue' })
        .eq('id', payment.id);
    }
  };

  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    return `${MONTHS_LABEL[parseInt(month) - 1]} ${year}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'overdue': return COLORS.red;
      case 'waived': return COLORS.info;
      default: return COLORS.textMuted;
    }
  };

  const getPaymentForMember = (memberId) => {
    return payments.find(p => p.user_id === memberId && p.month === currentMonth);
  };

  // Get paid and unpaid member lists
  const paidMembers = members.filter(m => {
    const p = getPaymentForMember(m.id);
    return p && p.status === 'paid';
  });

  const unpaidMembers = members.filter(m => {
    const p = getPaymentForMember(m.id);
    return !p || p.status !== 'paid';
  });

  const handleCreatePayment = async () => {
    if (!selectedMember || !amount.trim()) {
      showAlert.error('Error', 'Please enter an amount');
      return;
    }
    setSending(true);
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const { error } = await supabase.from('payments').upsert({
        user_id: selectedMember.id,
        month: currentMonth,
        amount: parseFloat(amount),
        status: 'pending',
        due_date: dueDate.toISOString().split('T')[0],
        updated_by: user.id,
      });

      if (error) throw new Error(error.message);
      showAlert.success('Success', 'Payment created');
      setShowModal(false);
      setAmount('');
      fetchData();
    } catch (error) {
      showAlert.error('Error', error.message);
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedPayment) return;
    setSending(true);
    try {
      const updates = { status: newStatus, updated_by: user.id };
      if (newStatus === 'paid') {
        updates.paid_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', selectedPayment.id);

      if (error) throw new Error(error.message);
      showAlert.success('Success', `Status updated to ${newStatus}`);
      setShowModal(false);
      fetchData();
    } catch (error) {
      showAlert.error('Error', error.message);
    } finally {
      setSending(false);
    }
  };

  const handleSendReminder = async () => {
    if (!selectedMember || !reminderMessage.trim()) {
      showAlert.error('Error', 'Please enter a message');
      return;
    }
    setSending(true);
    try {
      // Save to notifications table
      const { error } = await supabase.from('notifications').insert({
        user_id: selectedMember.id,
        title: 'Payment Reminder',
        message: reminderMessage.trim(),
        type: 'payment',
        sent_by: user.id,
      });
      if (error) throw new Error(error.message);

      // Send push notification
      if (selectedMember.push_token) {
        await sendPushNotification(
          selectedMember.push_token,
          'Payment Reminder',
          reminderMessage.trim()
        );
      }

      showAlert.success('Success', `Reminder sent to ${selectedMember.full_name}`);
      setShowModal(false);
      setReminderMessage('');
    } catch (error) {
      showAlert.error('Error', error.message);
    } finally {
      setSending(false);
    }
  };

  // Send reminder to all unpaid members
  const handleBulkReminder = () => {
    showAlert.confirm(
      'Send to All Unpaid',
      `Send payment reminder to ${unpaidMembers.length} unpaid members?`,
      async () => {
        setSending(true);
        try {
          const tokens = [];
          for (const member of unpaidMembers) {
            const payment = getPaymentForMember(member.id);
            const msg = `Hi ${member.full_name}, your gym payment for ${formatMonth(currentMonth)}${payment ? ` of Rs. ${payment.amount}` : ''} is pending. Please clear your dues.`;

            await supabase.from('notifications').insert({
              user_id: member.id,
              title: 'Payment Due',
              message: msg,
              type: 'payment',
              sent_by: user.id,
            });

            if (member.push_token) tokens.push(member.push_token);
          }

          if (tokens.length > 0) {
            await sendBulkPushNotifications(
              tokens,
              'Payment Due',
              `Your gym payment for ${formatMonth(currentMonth)} is pending. Please clear your dues.`
            );
          }

          showAlert.success('Success', `Reminders sent to ${unpaidMembers.length} members`);
        } catch (error) {
          showAlert.error('Error', error.message);
        } finally {
          setSending(false);
        }
      }
    );
  };

  const openCreateModal = (member) => {
    setSelectedMember(member);
    setModalMode('create');
    setAmount('');
    setShowModal(true);
  };

  const openStatusModal = (member, payment) => {
    setSelectedMember(member);
    setSelectedPayment(payment);
    setModalMode('status');
    setShowModal(true);
  };

  const openReminderModal = (member) => {
    setSelectedMember(member);
    setModalMode('reminder');
    const payment = getPaymentForMember(member.id);
    setReminderMessage(
      `Hi ${member.full_name}, your gym payment${payment ? ` of Rs. ${payment.amount}` : ''} for ${formatMonth(currentMonth)} is pending. Please clear your dues at your earliest convenience.`
    );
    setShowModal(true);
  };

  // Stats
  const currentMonthPayments = payments.filter(p => p.month === currentMonth);
  const totalCollected = currentMonthPayments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = currentMonthPayments.filter(p => p.status !== 'paid' && p.status !== 'waived').reduce((s, p) => s + p.amount, 0);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  const renderMemberRow = (member) => {
    const payment = getPaymentForMember(member.id);
    const statusColor = payment ? getStatusColor(payment.status) : COLORS.textMuted;

    return (
      <View key={member.id} style={styles.memberRow}>
        <View style={styles.memberLeft}>
          <View style={[styles.memberAvatar, { backgroundColor: statusColor + '15' }]}>
            {member.profile_picture ? (
              <Image source={{ uri: member.profile_picture }} style={styles.memberAvatarImg} />
            ) : (
              <MaterialIcons name="person" size={20} color={statusColor} />
            )}
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{member.full_name || 'Member'}</Text>
            <Text style={styles.memberEmail}>{member.email}</Text>
          </View>
        </View>

        <View style={styles.memberRight}>
          {payment ? (
            <TouchableOpacity
              style={[styles.paymentBadge, { backgroundColor: statusColor + '20' }]}
              onPress={() => openStatusModal(member, payment)}
            >
              <Text style={[styles.paymentBadgeAmount, { color: statusColor }]}>
                Rs. {payment.amount.toLocaleString()}
              </Text>
              <Text style={[styles.paymentBadgeStatus, { color: statusColor }]}>
                {payment.status.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.addPaymentBtn}
              onPress={() => openCreateModal(member)}
            >
              <MaterialIcons name="add" size={18} color={COLORS.red} />
              <Text style={styles.addPaymentText}>Add</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.reminderBtn}
            onPress={() => openReminderModal(member)}
          >
            <MaterialIcons name="notifications" size={18} color={COLORS.warning} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const STATUSES = ['pending', 'paid', 'overdue', 'waived'];

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.menuButton} onPress={() => navigation.openDrawer()}>
            <MaterialIcons name="menu" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.title}>Payments</Text>
        </View>
        <Text style={styles.subtitle}>{formatMonth(currentMonth)}</Text>

        {/* Revenue Overview */}
        <View style={styles.revenueCard}>
          <View style={styles.revenueRow}>
            <View style={styles.revenueItem}>
              <Text style={styles.revenueLabel}>Collected</Text>
              <Text style={[styles.revenueValue, { color: COLORS.success }]}>
                Rs. {totalCollected.toLocaleString()}
              </Text>
            </View>
            <View style={styles.revenueDivider} />
            <View style={styles.revenueItem}>
              <Text style={styles.revenueLabel}>Pending</Text>
              <Text style={[styles.revenueValue, { color: COLORS.warning }]}>
                Rs. {totalPending.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Summary */}
        <View style={styles.statusRow}>
          <View style={styles.statusCard}>
            <Text style={[styles.statusNum, { color: COLORS.success }]}>{paidMembers.length}</Text>
            <Text style={styles.statusLabel}>Paid</Text>
          </View>
          <View style={styles.statusCard}>
            <Text style={[styles.statusNum, { color: COLORS.red }]}>{unpaidMembers.length}</Text>
            <Text style={styles.statusLabel}>Unpaid</Text>
          </View>
          <View style={styles.statusCard}>
            <Text style={[styles.statusNum, { color: COLORS.white }]}>{members.length}</Text>
            <Text style={styles.statusLabel}>Total</Text>
          </View>
        </View>

        {/* Bulk Reminder Button */}
        {unpaidMembers.length > 0 && (
          <TouchableOpacity style={styles.bulkReminderBtn} onPress={handleBulkReminder} disabled={sending}>
            <MaterialIcons name="campaign" size={20} color={COLORS.warning} />
            <Text style={styles.bulkReminderText}>
              Send Reminder to All Unpaid ({unpaidMembers.length})
            </Text>
            {sending && <ActivityIndicator size="small" color={COLORS.warning} />}
          </TouchableOpacity>
        )}

        {/* Paid / Unpaid Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, paymentTab === 'unpaid' && styles.tabActive]}
            onPress={() => setPaymentTab('unpaid')}
          >
            <Text style={[styles.tabText, paymentTab === 'unpaid' && styles.tabTextActive]}>
              Unpaid ({unpaidMembers.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, paymentTab === 'paid' && styles.tabActive]}
            onPress={() => setPaymentTab('paid')}
          >
            <Text style={[styles.tabText, paymentTab === 'paid' && styles.tabTextActive]}>
              Paid ({paidMembers.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Member List */}
        {paymentTab === 'unpaid' && (
          unpaidMembers.length > 0 ? (
            unpaidMembers.map(renderMemberRow)
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="check-circle" size={48} color={COLORS.success} />
              <Text style={styles.emptyText}>All members have paid!</Text>
            </View>
          )
        )}

        {paymentTab === 'paid' && (
          paidMembers.length > 0 ? (
            paidMembers.map(renderMemberRow)
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="payments" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No payments received yet</Text>
            </View>
          )
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === 'create' ? 'Create Payment' :
                 modalMode === 'reminder' ? 'Send Reminder' : 'Update Status'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalMemberRow}>
              {selectedMember?.profile_picture ? (
                <Image source={{ uri: selectedMember.profile_picture }} style={styles.modalMemberPic} />
              ) : (
                <View style={styles.modalMemberIcon}>
                  <MaterialIcons name="person" size={20} color={COLORS.red} />
                </View>
              )}
              <Text style={styles.modalMemberName}>{selectedMember?.full_name}</Text>
            </View>

            {/* Create Payment */}
            {modalMode === 'create' && (
              <>
                <Text style={styles.inputLabel}>Amount (Rs.)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter amount"
                  placeholderTextColor={COLORS.textMuted}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                />
                <GradientButton
                  title="CREATE PAYMENT"
                  onPress={handleCreatePayment}
                  loading={sending}
                  style={styles.modalButton}
                />
              </>
            )}

            {/* Update Status */}
            {modalMode === 'status' && selectedPayment && (
              <>
                <View style={styles.currentStatusRow}>
                  <Text style={styles.currentStatusLabel}>Current:</Text>
                  <View style={[styles.currentStatusBadge, { backgroundColor: getStatusColor(selectedPayment.status) + '20' }]}>
                    <Text style={[styles.currentStatusText, { color: getStatusColor(selectedPayment.status) }]}>
                      {selectedPayment.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.currentStatusAmount}>
                    Rs. {selectedPayment.amount.toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.inputLabel}>Change Status To</Text>
                <View style={styles.statusGrid}>
                  {STATUSES.map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        { borderColor: getStatusColor(status) },
                        selectedPayment.status === status && styles.statusOptionDisabled,
                      ]}
                      onPress={() => handleUpdateStatus(status)}
                      disabled={selectedPayment.status === status || sending}
                    >
                      <MaterialIcons
                        name={status === 'paid' ? 'check-circle' : status === 'pending' ? 'schedule' : status === 'overdue' ? 'error' : 'remove-circle'}
                        size={20}
                        color={selectedPayment.status === status ? COLORS.textMuted : getStatusColor(status)}
                      />
                      <Text style={[
                        styles.statusOptionText,
                        { color: selectedPayment.status === status ? COLORS.textMuted : getStatusColor(status) },
                      ]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Send Reminder */}
            {modalMode === 'reminder' && (
              <>
                <Text style={styles.inputLabel}>Reminder Message</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="Enter reminder message..."
                  placeholderTextColor={COLORS.textMuted}
                  value={reminderMessage}
                  onChangeText={setReminderMessage}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <GradientButton
                  title="SEND NOTIFICATION"
                  onPress={handleSendReminder}
                  loading={sending}
                  style={styles.modalButton}
                  icon={<MaterialIcons name="send" size={18} color={COLORS.white} />}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    color: COLORS.white,
    fontSize: SIZES.xxl,
    ...FONTS.bold,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.regular,
    marginBottom: 20,
    marginTop: 4,
  },
  revenueCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  revenueItem: {
    flex: 1,
    alignItems: 'center',
  },
  revenueLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
    marginBottom: 6,
  },
  revenueValue: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
  },
  revenueDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statusCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusSm,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusNum: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
  },
  statusLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    ...FONTS.medium,
    marginTop: 4,
  },
  bulkReminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.warning + '15',
    borderRadius: SIZES.radius,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
  },
  bulkReminderText: {
    color: COLORS.warning,
    fontSize: SIZES.sm,
    ...FONTS.bold,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusSm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.red,
    borderColor: COLORS.red,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.semiBold,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  memberAvatarImg: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.semiBold,
  },
  memberEmail: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
    ...FONTS.regular,
    marginTop: 1,
  },
  memberRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  paymentBadgeAmount: {
    fontSize: SIZES.sm,
    ...FONTS.bold,
  },
  paymentBadgeStatus: {
    fontSize: 9,
    ...FONTS.bold,
    marginTop: 2,
  },
  addPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.red + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addPaymentText: {
    color: COLORS.red,
    fontSize: SIZES.sm,
    ...FONTS.bold,
  },
  reminderBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.warning + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: SIZES.md,
    ...FONTS.medium,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
  modalMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  modalMemberPic: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  modalMemberIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.red + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalMemberName: {
    color: COLORS.red,
    fontSize: SIZES.md,
    ...FONTS.semiBold,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: COLORS.cardLight,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    color: COLORS.white,
    fontSize: SIZES.base,
    marginBottom: 16,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButton: {
    marginTop: 4,
  },
  currentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    backgroundColor: COLORS.cardLight,
    borderRadius: SIZES.radiusSm,
    padding: 12,
  },
  currentStatusLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
  },
  currentStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentStatusText: {
    fontSize: SIZES.xs,
    ...FONTS.bold,
  },
  currentStatusAmount: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
    marginLeft: 'auto',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusOption: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1.5,
    backgroundColor: COLORS.cardLight,
  },
  statusOptionDisabled: {
    opacity: 0.3,
  },
  statusOptionText: {
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
});

export default TrainerPaymentsScreen;
