import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { StatCard } from '../../components/common/StatCard';
import { IconCircle } from '../../components/common/IconCircle';
import { SectionHeader } from '../../components/common/SectionHeader';
import { FadeInView, PressableScale } from '../../components/common/Motion';
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  Fonts,
  Gradients,
  Shadows,
} from '../../config/theme';
import { Group, Student } from '../../types';
import { GroupService } from '../../services/groupService';
import { getTodayDateString } from '../../utils/dateUtils';
import { useFocusEffect } from 'expo-router';
import { useAppNavigation, useAppRoute } from '../../navigation/appNavigation';
import { avatarTone, initialsOf } from '../../utils/avatar';

export const GroupDetailScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const route = useAppRoute<'GroupDetail'>();
  const groupId = route.params.groupId;

  const [group, setGroup] = useState<Group | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [grp, stds] = await Promise.all([
        GroupService.getGroupById(groupId),
        GroupService.getStudentsInGroup(groupId),
      ]);
      setGroup(grp);
      setStudents(stds);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load group details.');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const renderStudentItem = ({ item, index }: { item: Student; index: number }) => {
    const tone = avatarTone(item.fullName);
    return (
      <FadeInView index={index}>
        <Card
          style={styles.studentCard}
          onPress={() => navigation.navigate('StudentProfile', { studentId: item.id })}
        >
          <View style={styles.studentRow}>
            <View style={[styles.avatarWrap, { backgroundColor: tone.bg }]}>
              <Text style={[styles.avatarText, { color: tone.fg }]}>
                {initialsOf(item.fullName)}
              </Text>
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName} numberOfLines={1}>
                {item.fullName}
              </Text>
              <Text style={styles.studentSub} numberOfLines={1}>
                {item.admissionNumber ? `Roll: ${item.admissionNumber}  •  ` : ''}
                {item.contactPhone || 'No contact phone'}
              </Text>
            </View>
            <Badge type={item.isActive ? 'active' : 'inactive'} size="sm" />
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </View>
        </Card>
      </FadeInView>
    );
  };

  if (loading && !group) {
    return <LoadingScreen message="Loading group..." />;
  }

  if (!group) {
    return (
      <View style={styles.container}>
        <Header title="Group" onBack={() => navigation.goBack()} />
        <EmptyState
          title="Group Not Found"
          description="This group does not exist or was deleted."
          actionTitle="Back to Groups"
          onActionPress={() => navigation.goBack()}
        />
      </View>
    );
  }

  const today = getTodayDateString();

  return (
    <View style={styles.container}>
      <Header
        title={group.name}
        onBack={() => navigation.goBack()}
        rightAction={{
          icon: 'create-outline',
          label: 'Edit',
          onPress: () => navigation.navigate('GroupForm', { groupId: group.id }),
        }}
      />

      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={renderStudentItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            {/* Group Overview Banner */}
            <FadeInView style={styles.overviewCard}>
              <LinearGradient
                colors={Gradients.brand}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroGlow} />
              <View style={styles.overviewTop}>
                <IconCircle
                  icon="layers"
                  size={52}
                  square
                  color={Colors.accent}
                  bg={Colors.surface}
                />
                <View style={styles.overviewTextWrap}>
                  <Text style={styles.heroOverline}>Group</Text>
                  <Text style={styles.groupTitle}>{group.name}</Text>
                </View>
              </View>
              {group.description ? (
                <Text style={styles.groupDescText}>{group.description}</Text>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                <PressableScale
                  style={[styles.heroActionBtn, styles.heroActionPrimary]}
                  onPress={() =>
                    navigation.navigate('DailyAttendance', { groupId: group.id, date: today })
                  }
                  hapticOnPress
                >
                  <Ionicons name="checkbox-outline" size={18} color={Colors.primary} />
                  <Text style={[styles.heroActionText, { color: Colors.primary }]}>Attendance</Text>
                </PressableScale>
                <PressableScale
                  style={[styles.heroActionBtn, styles.heroActionGhost]}
                  onPress={() =>
                    navigation.navigate('DailyProgress', { groupId: group.id, date: today })
                  }
                  hapticOnPress
                >
                  <Ionicons name="book-outline" size={18} color={Colors.textInverse} />
                  <Text style={styles.heroActionText}>Daily Sabak</Text>
                </PressableScale>
              </View>
            </FadeInView>

            {/* Stats */}
            <FadeInView index={1} style={styles.overviewStatsRow}>
              <StatCard title="Active Students" value={students.length} icon="people-outline" />
              <StatCard
                title="Sort Order"
                value={group.sortOrder}
                icon="reorder-four-outline"
                color={Colors.accentDark}
                bgColor={Colors.accentLight}
              />
            </FadeInView>

            <SectionHeader
              title="Enrolled Students"
              meta={`(${students.length})`}
              style={styles.sectionHeaderRow}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No Students in this Group"
            description="Assign existing students or register a new student to this group."
            actionTitle="Register Student"
            onActionPress={() => navigation.navigate('StudentForm', {})}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxxl,
  },
  headerBlock: {
    marginBottom: Spacing.xs,
  },
  overviewCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.primary,
    ...Shadows.lg,
  },
  heroGlow: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accentGlow,
  },
  overviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  overviewTextWrap: {
    flex: 1,
  },
  heroOverline: {
    ...Typography.overline,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  groupTitle: {
    ...Typography.titleLarge,
    color: Colors.textInverse,
    marginTop: 2,
  },
  groupDescText: {
    ...Typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: Spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  heroActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  heroActionPrimary: {
    backgroundColor: Colors.surface,
  },
  heroActionGhost: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  heroActionText: {
    ...Typography.button,
    fontSize: 14,
    color: Colors.textInverse,
  },
  overviewStatsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  sectionHeaderRow: {
    marginBottom: Spacing.md,
  },
  studentCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarWrap: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    ...Typography.titleSmall,
    fontFamily: Fonts.bold,
  },
  studentSub: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
});
