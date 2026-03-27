import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, SHADOWS } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import { getBMICategoryColor } from '../utils/bmiCalculator';
import GradientButton from '../components/GradientButton';
import ScreenWrapper from '../components/ScreenWrapper';
import { showAlert } from '../components/ThemedAlert';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const AdminDashboard = ({ navigation }) => {
  const { profile } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignType, setAssignType] = useState('workout');
  const [assignNote, setAssignNote] = useState('');
  const [activeTab, setActiveTab] = useState('members');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [showProfilePic, setShowProfilePic] = useState(null); // member object to show pic

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendance();
    }
  }, [activeTab]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'member')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    setAttendanceLoading(true);
    try {
      // Fetch today's attendance with user info
      const { data: todayData, error: todayError } = await supabase
        .from('attendance')
        .select('*, users:user_id(full_name, email, profile_picture)')
        .eq('date', todayStr)
        .order('check_in_time', { ascending: false });

      if (todayError) console.error('Today attendance error:', todayError);
      setTodayAttendance(todayData || []);

      // Fetch last 7 days attendance
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      const { data: weekData, error: weekError } = await supabase
        .from('attendance')
        .select('*, users:user_id(full_name, email, profile_picture)')
        .gte('date', weekAgoStr)
        .order('date', { ascending: false })
        .order('check_in_time', { ascending: false });

      if (weekError) console.error('Week attendance error:', weekError);
      setAttendanceRecords(weekData || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const toggleMemberStatus = async (member) => {
    const newStatus = member.is_active === false ? true : false;
    const action = newStatus ? 'Activate' : 'Deactivate';
    showAlert.confirm(
      `${action} Member`,
      `Are you sure you want to ${action.toLowerCase()} ${member.full_name || 'this member'}?`,
      async () => {
        try {
          const { error } = await supabase
            .from('users')
            .update({ is_active: newStatus })
            .eq('id', member.id);
          if (error) throw error;
          showAlert.success('Success', `${member.full_name} has been ${newStatus ? 'activated' : 'deactivated'}`);
          fetchMembers();
        } catch (error) {
          showAlert.error('Error', error.message);
        }
      }
    );
  };

  const handleAssign = async () => {
    if (!selectedMember || !assignNote.trim()) {
      showAlert.error('Error', 'Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase.from('assignments').insert({
        trainer_id: profile.id,
        member_id: selectedMember.id,
        type: assignType,
        content: assignNote.trim(),
      });

      if (error) throw error;
      showAlert.success('Success', `${assignType} assigned successfully!`);
      setShowAssignModal(false);
      setAssignNote('');
    } catch (error) {
      showAlert.error('Error', error.message);
    }
  };

  const renderMemberCard = ({ item }) => {
    const bmiColor = getBMICategoryColor(item.bmi_category);
    const isActive = item.is_active !== false; // default to true

    return (
      <View style={[styles.memberCard, !isActive && styles.memberCardInactive]}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}
          onPress={() => {
            setSelectedMember(item);
            setShowAssignModal(true);
          }}
          activeOpacity={0.8}
        >
          <TouchableOpacity
            style={styles.memberAvatar}
            onPress={() => item.profile_picture ? setShowProfilePic(item) : null}
          >
            {item.profile_picture ? (
              <Image source={{ uri: item.profile_picture }} style={styles.memberAvatarImage} />
            ) : (
              <MaterialIcons name="person" size={24} color={isActive ? COLORS.red : COLORS.textMuted} />
            )}
          </TouchableOpacity>
          <View style={styles.memberInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.memberName, !isActive && { color: COLORS.textMuted }]}>
                {item.full_name || 'Member'}
              </Text>
              {!isActive && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveBadgeText}>INACTIVE</Text>
                </View>
              )}
            </View>
            <Text style={styles.memberEmail}>{item.email}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.memberRightCol}>
          <View style={styles.memberStats}>
            {item.bmi ? (
              <>
                <Text style={[styles.memberBmi, { color: bmiColor }]}>{item.bmi}</Text>
                <Text style={styles.memberCategory}>{item.bmi_category}</Text>
              </>
            ) : (
              <Text style={styles.noBmi}>No BMI</Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.statusToggle, isActive ? styles.statusToggleActive : styles.statusToggleInactive]}
            onPress={() => toggleMemberStatus(item)}
          >
            <MaterialIcons
              name={isActive ? 'toggle-on' : 'toggle-off'}
              size={28}
              color={isActive ? COLORS.success : COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton} onPress={() => navigation.openDrawer()}>
            <MaterialIcons name="menu" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Trainer Panel</Text>
            <Text style={styles.name}>{profile?.full_name || 'Trainer'}</Text>
          </View>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <MaterialIcons name="people" size={24} color={COLORS.red} />
            <Text style={styles.statValue}>{members.length}</Text>
            <Text style={styles.statLabel}>Total Members</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="fitness-center" size={24} color={COLORS.info} />
            <Text style={styles.statValue}>
              {members.filter(m => m.bmi).length}
            </Text>
            <Text style={styles.statLabel}>Onboarded</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="trending-up" size={24} color={COLORS.success} />
            <Text style={styles.statValue}>
              {members.filter(m => m.bmi_category === 'Normal').length}
            </Text>
            <Text style={styles.statLabel}>Healthy BMI</Text>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'members' && styles.tabActive]}
            onPress={() => setActiveTab('members')}
          >
            <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
              Members
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'attendance' && styles.tabActive]}
            onPress={() => setActiveTab('attendance')}
          >
            <Text style={[styles.tabText, activeTab === 'attendance' && styles.tabTextActive]}>
              Attendance
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>
        </View>

        {/* Members List */}
        {activeTab === 'members' && (
          <View style={styles.membersSection}>
            <Text style={styles.sectionTitle}>All Members</Text>
            {members.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="people-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No members yet</Text>
              </View>
            ) : (
              members.map((item, index) => (
                <View key={item.id || index}>{renderMemberCard({ item })}</View>
              ))
            )}
          </View>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <View style={styles.attendanceSection}>
            {/* Today's Summary */}
            <View style={styles.attendanceSummaryCard}>
              <Text style={styles.sectionTitle}>Today's Attendance</Text>
              <Text style={styles.attendanceDate}>{todayStr}</Text>
              <View style={styles.attendanceStatsRow}>
                <View style={styles.attendanceStatItem}>
                  <Text style={[styles.attendanceStatValue, { color: COLORS.success }]}>
                    {todayAttendance.filter(a => a.status === 'present').length}
                  </Text>
                  <Text style={styles.attendanceStatLabel}>Present</Text>
                </View>
                <View style={styles.attendanceStatItem}>
                  <Text style={[styles.attendanceStatValue, { color: COLORS.warning }]}>
                    {todayAttendance.filter(a => a.status === 'late').length}
                  </Text>
                  <Text style={styles.attendanceStatLabel}>Late</Text>
                </View>
                <View style={styles.attendanceStatItem}>
                  <Text style={[styles.attendanceStatValue, { color: COLORS.textMuted }]}>
                    {members.length - todayAttendance.length}
                  </Text>
                  <Text style={styles.attendanceStatLabel}>Not Marked</Text>
                </View>
              </View>
            </View>

            {/* Today's List */}
            {todayAttendance.length > 0 ? (
              <View style={styles.attendanceList}>
                <Text style={styles.attendanceListTitle}>Checked In Today</Text>
                {todayAttendance.map((record, index) => {
                  const statusColor = record.status === 'present' ? COLORS.success :
                    record.status === 'late' ? COLORS.warning : COLORS.red;
                  const checkTime = record.check_in_time
                    ? new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '-';

                  return (
                    <View key={record.id || index} style={styles.attendanceRow}>
                      <View style={styles.attendanceAvatar}>
                        {record.users?.profile_picture ? (
                          <Image source={{ uri: record.users.profile_picture }} style={styles.memberAvatarImage} />
                        ) : (
                          <MaterialIcons name="person" size={20} color={statusColor} />
                        )}
                      </View>
                      <View style={styles.attendanceInfo}>
                        <Text style={styles.attendanceName}>
                          {record.users?.full_name || 'Member'}
                        </Text>
                        <Text style={styles.attendanceEmail}>{record.users?.email}</Text>
                      </View>
                      <View style={styles.attendanceRight}>
                        <Text style={styles.attendanceTime}>{checkTime}</Text>
                        <View style={[styles.attendanceStatusBadge, { backgroundColor: statusColor + '20' }]}>
                          <Text style={[styles.attendanceStatusText, { color: statusColor }]}>
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="event-busy" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No check-ins today yet</Text>
              </View>
            )}

            {/* Not Checked In */}
            {members.length > 0 && (
              <View style={styles.attendanceList}>
                <Text style={styles.attendanceListTitle}>Not Checked In</Text>
                {members
                  .filter(m => !todayAttendance.find(a => a.user_id === m.id))
                  .map((member, index) => (
                    <View key={member.id || index} style={styles.attendanceRow}>
                      <View style={[styles.attendanceAvatar, { backgroundColor: COLORS.textMuted + '15' }]}>
                        <MaterialIcons name="person-outline" size={20} color={COLORS.textMuted} />
                      </View>
                      <View style={styles.attendanceInfo}>
                        <Text style={styles.attendanceName}>{member.full_name || 'Member'}</Text>
                        <Text style={styles.attendanceEmail}>{member.email}</Text>
                      </View>
                      <View style={[styles.attendanceStatusBadge, { backgroundColor: COLORS.textMuted + '15' }]}>
                        <Text style={[styles.attendanceStatusText, { color: COLORS.textMuted }]}>Absent</Text>
                      </View>
                    </View>
                  ))}
              </View>
            )}

            {/* Week History */}
            {attendanceRecords.length > 0 && (
              <View style={styles.attendanceList}>
                <Text style={styles.attendanceListTitle}>Last 7 Days</Text>
                {(() => {
                  // Group by date
                  const grouped = {};
                  attendanceRecords.forEach(r => {
                    if (!grouped[r.date]) grouped[r.date] = [];
                    grouped[r.date].push(r);
                  });

                  return Object.entries(grouped).map(([date, records]) => {
                    const d = new Date(date + 'T00:00:00');
                    const presentCount = records.filter(r => r.status === 'present').length;
                    const lateCount = records.filter(r => r.status === 'late').length;

                    return (
                      <View key={date} style={styles.weekDayRow}>
                        <View style={styles.weekDayDate}>
                          <Text style={styles.weekDayNum}>{d.getDate()}</Text>
                          <Text style={styles.weekDayMonth}>{MONTHS[d.getMonth()]}</Text>
                        </View>
                        <View style={styles.weekDayInfo}>
                          <View style={styles.weekDayBar}>
                            <View style={[styles.weekDayFill, {
                              width: `${members.length > 0 ? (records.length / members.length) * 100 : 0}%`,
                              backgroundColor: COLORS.success,
                            }]} />
                          </View>
                          <Text style={styles.weekDayStats}>
                            {presentCount} present{lateCount > 0 ? ` · ${lateCount} late` : ''}
                          </Text>
                        </View>
                        <Text style={styles.weekDayTotal}>
                          {records.length}/{members.length}
                        </Text>
                      </View>
                    );
                  });
                })()}
              </View>
            )}
          </View>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <View style={styles.overviewSection}>
            <Text style={styles.sectionTitle}>BMI Distribution</Text>
            {['Underweight', 'Normal', 'Overweight', 'Obese'].map((category) => {
              const count = members.filter(m => m.bmi_category === category).length;
              const pct = members.length > 0 ? (count / members.length) * 100 : 0;
              const color = getBMICategoryColor(category);

              return (
                <View key={category} style={styles.distRow}>
                  <View style={styles.distLabel}>
                    <View style={[styles.distDot, { backgroundColor: color }]} />
                    <Text style={styles.distName}>{category}</Text>
                  </View>
                  <View style={styles.distBar}>
                    <View
                      style={[styles.distFill, { width: `${pct}%`, backgroundColor: color }]}
                    />
                  </View>
                  <Text style={styles.distCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Profile Picture Popup */}
      <Modal visible={!!showProfilePic} transparent animationType="fade">
        <TouchableOpacity
          style={styles.picModalOverlay}
          activeOpacity={1}
          onPress={() => setShowProfilePic(null)}
        >
          <View style={styles.picModalContent}>
            {showProfilePic?.profile_picture && (
              <Image
                source={{ uri: showProfilePic.profile_picture }}
                style={styles.picModalImage}
                resizeMode="cover"
              />
            )}
            <Text style={styles.picModalName}>{showProfilePic?.full_name}</Text>
            <TouchableOpacity
              style={styles.picModalClose}
              onPress={() => setShowProfilePic(null)}
            >
              <MaterialIcons name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Assign Modal */}
      <Modal visible={showAssignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign to {selectedMember?.full_name}</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedMember?.bmi && (
              <View style={styles.memberDetail}>
                <Text style={styles.memberDetailText}>
                  BMI: {selectedMember.bmi} ({selectedMember.bmi_category})
                </Text>
                <Text style={styles.memberDetailText}>
                  Goal: {selectedMember.goal} | {selectedMember.daily_calories} kcal
                </Text>
              </View>
            )}

            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeBtn, assignType === 'workout' && styles.typeBtnActive]}
                onPress={() => setAssignType('workout')}
              >
                <MaterialIcons
                  name="fitness-center"
                  size={18}
                  color={assignType === 'workout' ? COLORS.white : COLORS.textMuted}
                />
                <Text style={[styles.typeBtnText, assignType === 'workout' && styles.typeBtnTextActive]}>
                  Workout
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, assignType === 'meal' && styles.typeBtnActive]}
                onPress={() => setAssignType('meal')}
              >
                <MaterialIcons
                  name="restaurant"
                  size={18}
                  color={assignType === 'meal' ? COLORS.white : COLORS.textMuted}
                />
                <Text style={[styles.typeBtnText, assignType === 'meal' && styles.typeBtnTextActive]}>
                  Meal Plan
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.noteInput}
              placeholder="Enter assignment details..."
              placeholderTextColor={COLORS.textMuted}
              value={assignNote}
              onChangeText={setAssignNote}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <GradientButton
              title="ASSIGN"
              onPress={handleAssign}
              style={styles.assignButton}
            />
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    color: COLORS.red,
    fontSize: SIZES.sm,
    ...FONTS.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  name: {
    color: COLORS.white,
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    marginTop: 4,
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
    marginRight: 12,
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
    fontSize: SIZES.xl,
    ...FONTS.bold,
    marginTop: 8,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    ...FONTS.medium,
    marginTop: 4,
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
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
  membersSection: {
    gap: 10,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
    marginBottom: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.red + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  memberEmail: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    ...FONTS.regular,
    marginTop: 2,
  },
  memberStats: {
    alignItems: 'flex-end',
  },
  memberBmi: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
  memberCategory: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    ...FONTS.medium,
  },
  noBmi: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    ...FONTS.medium,
  },
  memberCardInactive: {
    opacity: 0.6,
    borderColor: COLORS.textMuted + '30',
  },
  memberRightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  inactiveBadge: {
    backgroundColor: COLORS.textMuted + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    color: COLORS.textMuted,
    fontSize: 8,
    ...FONTS.bold,
    letterSpacing: 0.5,
  },
  statusToggle: {
    padding: 2,
  },
  statusToggleActive: {},
  statusToggleInactive: {},
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
  overviewSection: {
    gap: 12,
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusSm,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  distLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 100,
  },
  distDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  distName: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
  },
  distBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.cardLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  distFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 4,
  },
  distCount: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
    width: 30,
    textAlign: 'right',
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
    marginBottom: 16,
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
  memberDetail: {
    backgroundColor: COLORS.cardLight,
    borderRadius: SIZES.radiusSm,
    padding: 12,
    marginBottom: 16,
  },
  memberDetailText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
    marginBottom: 4,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    backgroundColor: COLORS.cardLight,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeBtnActive: {
    backgroundColor: COLORS.red,
    borderColor: COLORS.red,
  },
  typeBtnText: {
    color: COLORS.textMuted,
    fontSize: SIZES.md,
    ...FONTS.semiBold,
  },
  typeBtnTextActive: {
    color: COLORS.white,
  },
  noteInput: {
    backgroundColor: COLORS.cardLight,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    color: COLORS.white,
    fontSize: SIZES.md,
    minHeight: 100,
    marginBottom: 16,
  },
  assignButton: {
    marginTop: 4,
  },
  attendanceSection: {
    gap: 16,
  },
  attendanceSummaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  attendanceDate: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.regular,
    marginBottom: 16,
  },
  attendanceStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  attendanceStatItem: {
    alignItems: 'center',
  },
  attendanceStatValue: {
    fontSize: SIZES.xxl,
    ...FONTS.bold,
  },
  attendanceStatLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    ...FONTS.medium,
    marginTop: 4,
  },
  attendanceList: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  attendanceListTitle: {
    color: COLORS.white,
    fontSize: SIZES.base,
    ...FONTS.bold,
    marginBottom: 14,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  attendanceAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.success + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendanceInfo: {
    flex: 1,
  },
  attendanceName: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.semiBold,
  },
  attendanceEmail: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
    ...FONTS.regular,
    marginTop: 2,
  },
  attendanceRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  attendanceTime: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    ...FONTS.medium,
  },
  attendanceStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  attendanceStatusText: {
    fontSize: SIZES.xs,
    ...FONTS.bold,
  },
  weekDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  weekDayDate: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.cardLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDayNum: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  weekDayMonth: {
    color: COLORS.textMuted,
    fontSize: 9,
    ...FONTS.medium,
    textTransform: 'uppercase',
  },
  weekDayInfo: {
    flex: 1,
  },
  weekDayBar: {
    height: 6,
    backgroundColor: COLORS.cardLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  weekDayFill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 4,
  },
  weekDayStats: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    ...FONTS.medium,
  },
  weekDayTotal: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  memberAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  picModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  picModalContent: {
    alignItems: 'center',
  },
  picModalImage: {
    width: 250,
    height: 250,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.red,
  },
  picModalName: {
    color: COLORS.white,
    fontSize: SIZES.xl,
    ...FONTS.bold,
    marginTop: 16,
  },
  picModalClose: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AdminDashboard;
