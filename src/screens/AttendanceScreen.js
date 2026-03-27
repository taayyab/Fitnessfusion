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
import GradientButton from '../components/GradientButton';
import { showAlert } from '../components/ThemedAlert';
import ScreenWrapper from '../components/ScreenWrapper';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_OF_WEEK = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const AttendanceScreen = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [todayMarked, setTodayMarked] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [monthRecords, setMonthRecords] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState({ total: 0, present: 0, streak: 0 });

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const fetchAttendance = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Check today's attendance
      const { data: todayData } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .maybeSingle();

      if (todayData) {
        setTodayMarked(true);
        setTodayRecord(todayData);
      } else {
        setTodayMarked(false);
        setTodayRecord(null);
      }

      // Fetch month records
      const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
      const endDate = selectedMonth === 11
        ? `${selectedYear + 1}-01-01`
        : `${selectedYear}-${String(selectedMonth + 2).padStart(2, '0')}-01`;

      const { data: monthData } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lt('date', endDate)
        .order('date', { ascending: true });

      setMonthRecords(monthData || []);

      // Calculate stats
      const { data: allData } = await supabase
        .from('attendance')
        .select('date, status')
        .eq('user_id', user.id)
        .eq('status', 'present')
        .order('date', { ascending: false });

      const totalPresent = allData?.length || 0;

      // Calculate streak
      let streak = 0;
      if (allData && allData.length > 0) {
        const dates = allData.map(r => r.date);
        let checkDate = new Date(todayStr);

        // If today is not marked, start from yesterday
        if (!todayData || todayData.status !== 'present') {
          checkDate.setDate(checkDate.getDate() - 1);
        }

        for (let i = 0; i < 365; i++) {
          const dateStr = checkDate.toISOString().split('T')[0];
          if (dates.includes(dateStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }

      setStats({ total: monthData?.length || 0, present: totalPresent, streak });
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  }, [user, todayStr, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const markAttendance = async (status = 'present') => {
    if (!user) return;
    setMarking(true);
    try {
      const { error } = await supabase.from('attendance').upsert({
        user_id: user.id,
        date: todayStr,
        status,
        check_in_time: new Date().toISOString(),
      });

      if (error) throw new Error(error.message);
      await fetchAttendance();
    } catch (error) {
      showAlert.error('Error', error.message);
    } finally {
      setMarking(false);
    }
  };

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const getStatusForDate = (dateStr) => {
    const record = monthRecords.find(r => r.date === dateStr);
    return record?.status || null;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return COLORS.success;
      case 'late': return COLORS.warning;
      case 'absent': return COLORS.red;
      default: return 'transparent';
    }
  };

  const changeMonth = (direction) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    if (newMonth < 0) { newMonth = 11; newYear--; }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
    const cells = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.calendarCell} />);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const status = getStatusForDate(dateStr);
      const isToday = dateStr === todayStr;
      const isFuture = new Date(dateStr) > today;

      cells.push(
        <View key={day} style={[styles.calendarCell]}>
          <View style={[
            styles.calendarDay,
            isToday && styles.calendarDayToday,
            status && { backgroundColor: getStatusColor(status) + '25' },
          ]}>
            <Text style={[
              styles.calendarDayText,
              isToday && styles.calendarDayTextToday,
              isFuture && { color: COLORS.textMuted },
            ]}>
              {day}
            </Text>
            {status && (
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
            )}
          </View>
        </View>
      );
    }

    return cells;
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
        <Text style={styles.title}>Attendance</Text>

        {/* Today's Status Card */}
        <View style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <View>
              <Text style={styles.todayLabel}>Today</Text>
              <Text style={styles.todayDate}>
                {DAYS_OF_WEEK[today.getDay()]}, {today.getDate()} {MONTHS[today.getMonth()]} {today.getFullYear()}
              </Text>
            </View>
            {todayMarked && (
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(todayRecord?.status) + '20' }]}>
                <View style={[styles.statusBadgeDot, { backgroundColor: getStatusColor(todayRecord?.status) }]} />
                <Text style={[styles.statusBadgeText, { color: getStatusColor(todayRecord?.status) }]}>
                  {todayRecord?.status?.charAt(0).toUpperCase() + todayRecord?.status?.slice(1)}
                </Text>
              </View>
            )}
          </View>

          {!todayMarked ? (
            <View style={styles.markSection}>
              <Text style={styles.markPrompt}>You haven't marked attendance today</Text>
              <View style={styles.markButtons}>
                <GradientButton
                  title="CHECK IN"
                  onPress={() => markAttendance('present')}
                  loading={marking}
                  style={styles.checkInButton}
                  icon={<MaterialIcons name="check-circle" size={20} color={COLORS.white} />}
                />
              </View>
              <TouchableOpacity
                style={styles.lateButton}
                onPress={() => markAttendance('late')}
                disabled={marking}
              >
                <MaterialIcons name="schedule" size={16} color={COLORS.warning} />
                <Text style={styles.lateButtonText}>Mark as Late</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.checkedInSection}>
              <MaterialIcons name="check-circle" size={32} color={COLORS.success} />
              <View style={styles.checkedInInfo}>
                <Text style={styles.checkedInText}>Checked in</Text>
                <Text style={styles.checkedInTime}>at {formatTime(todayRecord?.check_in_time)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <MaterialIcons name="local-fire-department" size={24} color={COLORS.red} />
            <Text style={styles.statValue}>{stats.streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="event-available" size={24} color={COLORS.success} />
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="emoji-events" size={24} color={COLORS.warning} />
            <Text style={styles.statValue}>{stats.present}</Text>
            <Text style={styles.statLabel}>All Time</Text>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.calendarNav}>
              <MaterialIcons name="chevron-left" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.calendarTitle}>
              {MONTHS[selectedMonth]} {selectedYear}
            </Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.calendarNav}>
              <MaterialIcons name="chevron-right" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View style={styles.calendarRow}>
            {DAYS_OF_WEEK.map(day => (
              <View key={day} style={styles.calendarCell}>
                <Text style={styles.calendarHeaderText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {renderCalendar()}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.legendText}>Present</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.legendText}>Late</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.red }]} />
              <Text style={styles.legendText}>Absent</Text>
            </View>
          </View>
        </View>

        {/* Recent Records */}
        {monthRecords.length > 0 && (
          <View style={styles.recentCard}>
            <Text style={styles.recentTitle}>This Month's Records</Text>
            {[...monthRecords].reverse().map((record, index) => {
              const d = new Date(record.date + 'T00:00:00');
              return (
                <View key={record.id || index} style={styles.recordRow}>
                  <View style={styles.recordDate}>
                    <Text style={styles.recordDay}>{d.getDate()}</Text>
                    <Text style={styles.recordMonth}>{MONTHS[d.getMonth()]}</Text>
                  </View>
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordDayName}>{DAYS_OF_WEEK[d.getDay()]}</Text>
                    <Text style={styles.recordTime}>
                      {record.check_in_time ? formatTime(record.check_in_time) : '-'}
                    </Text>
                  </View>
                  <View style={[styles.recordStatus, { backgroundColor: getStatusColor(record.status) + '20' }]}>
                    <Text style={[styles.recordStatusText, { color: getStatusColor(record.status) }]}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </Text>
                  </View>
                </View>
              );
            })}
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
  todayCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  todayLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  todayDate: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: SIZES.sm,
    ...FONTS.bold,
  },
  markSection: {
    alignItems: 'center',
  },
  markPrompt: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.regular,
    marginBottom: 16,
  },
  markButtons: {
    width: '100%',
  },
  checkInButton: {
    marginBottom: 12,
  },
  lateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  lateButtonText: {
    color: COLORS.warning,
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
  },
  checkedInSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '10',
    borderRadius: SIZES.radiusSm,
    padding: 16,
    gap: 14,
  },
  checkedInInfo: {},
  checkedInText: {
    color: COLORS.success,
    fontSize: SIZES.base,
    ...FONTS.bold,
  },
  checkedInTime: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.regular,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
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
  calendarCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarNav: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.cardLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarTitle: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
  calendarRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.28%',
    alignItems: 'center',
    marginBottom: 6,
  },
  calendarHeaderText: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
    ...FONTS.semiBold,
  },
  calendarDay: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: COLORS.red,
  },
  calendarDayText: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    ...FONTS.medium,
  },
  calendarDayTextToday: {
    color: COLORS.red,
    ...FONTS.bold,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    ...FONTS.medium,
  },
  recentCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recentTitle: {
    color: COLORS.white,
    fontSize: SIZES.base,
    ...FONTS.bold,
    marginBottom: 16,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 14,
  },
  recordDate: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.cardLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordDay: {
    color: COLORS.white,
    fontSize: SIZES.base,
    ...FONTS.bold,
  },
  recordMonth: {
    color: COLORS.textMuted,
    fontSize: 9,
    ...FONTS.medium,
    textTransform: 'uppercase',
  },
  recordInfo: {
    flex: 1,
  },
  recordDayName: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.semiBold,
  },
  recordTime: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.regular,
    marginTop: 2,
  },
  recordStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  recordStatusText: {
    fontSize: SIZES.xs,
    ...FONTS.bold,
  },
});

export default AttendanceScreen;
