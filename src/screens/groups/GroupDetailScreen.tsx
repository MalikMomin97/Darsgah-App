import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { Colors, Spacing, Typography, BorderRadius } from '../../config/theme';
import { Group, Student } from '../../types';
import { GroupService } from '../../services/groupService';
import { getTodayDateString } from '../../utils/dateUtils';
import { useFocusEffect } from 'expo-router';
import { useAppNavigation, useAppRoute } from '../../navigation/appNavigation';


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

  const renderStudentItem = ({ item }: { item: Student }) => (
    <Card
      style={styles.studentCard}
      onPress={() => navigation.navigate('StudentProfile', { studentId: item.id })}
    >
      <View style={styles.studentRow}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>{item.fullName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.fullName}</Text>
          <Text style={styles.studentSub}>
            {item.admissionNumber ? `Roll: ${item.admissionNumber} • ` : ''}
            {item.contactPhone || 'No contact phone'}
          </Text>
        </View>
        <Badge type={item.isActive ? 'active' : 'inactive'} size="sm" />
      </View>
    </Card>
  );

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
            <Card style={styles.overviewCard}>
              <View style={styles.overviewTop}>
                <View style={styles.groupIconWrap}>
                  <Ionicons name="layers" size={24} color={Colors.primary} />
                </View>
                <View style={styles.overviewTextWrap}>
                  <Text style={styles.groupTitle}>{group.name}</Text>
                  {group.description ? (
                    <Text style={styles.groupDescText}>{group.description}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.overviewStatsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{students.length}</Text>
                  <Text style={styles.statLbl}>Active Students</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{group.sortOrder}</Text>
                  <Text style={styles.statLbl}>Sort Order</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                <Button
                  title="Attendance"
                  icon="checkbox-outline"
                  onPress={() =>
                    navigation.navigate('DailyAttendance', { groupId: group.id, date: today })
                  }
                  style={styles.actionBtn}
                />
                <Button
                  title="Daily Sabak"
                  variant="secondary"
                  icon="book-outline"
                  onPress={() =>
                    navigation.navigate('DailyProgress', { groupId: group.id, date: today })
                  }
                  style={styles.actionBtn}
                />
              </View>
            </Card>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Enrolled Students ({students.length})
              </Text>
            </View>
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
    padding: Spacing.lg,
  },
  headerBlock: {
    marginBottom: Spacing.md,
  },
  overviewCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  overviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  groupIconWrap: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewTextWrap: {
    flex: 1,
  },
  groupTitle: {
    ...Typography.titleMedium,
    color: Colors.text,
  },
  groupDescText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  overviewStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  statBox: {
    alignItems: 'center',
  },
  statVal: {
    ...Typography.titleMedium,
    fontWeight: '800',
    color: Colors.primary,
  },
  statLbl: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
  sectionHeaderRow: {
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.titleSmall,
    color: Colors.text,
  },
  studentCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.titleSmall,
    color: Colors.primary,
    fontWeight: '700',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text,
  },
  studentSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
