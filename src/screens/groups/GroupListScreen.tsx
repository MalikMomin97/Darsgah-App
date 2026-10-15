import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { Colors, Spacing, Typography, BorderRadius } from '../../config/theme';
import { Group } from '../../types';
import { GroupService } from '../../services/groupService';
import { useFocusEffect } from 'expo-router';
import { useAppNavigation } from '../../navigation/appNavigation';


export const GroupListScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const data = await GroupService.getGroups(showArchived);
      setGroups(data);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load groups.');
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [fetchGroups])
  );

  const renderGroupItem = ({ item }: { item: Group }) => (
    <Card
      style={styles.groupCard}
      onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleWrap}>
          <Text style={styles.groupName}>{item.name}</Text>
          {item.isArchived ? <Badge type="archived" size="sm" /> : null}
        </View>
        <View style={styles.badgeContainer}>
          <View style={styles.studentCountBadge}>
            <Ionicons name="people" size={14} color={Colors.primary} />
            <Text style={styles.studentCountText}>
              {item.studentCount ?? 0} {item.studentCount === 1 ? 'Student' : 'Students'}
            </Text>
          </View>
        </View>
      </View>

      {item.description ? (
        <Text style={styles.groupDesc} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('DailyAttendance', { groupId: item.id })}
        >
          <Ionicons name="checkbox-outline" size={16} color={Colors.primary} />
          <Text style={styles.actionBtnText}>Take Attendance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('GroupForm', { groupId: item.id })}
        >
          <Ionicons name="create-outline" size={16} color={Colors.textSecondary} />
          <Text style={[styles.actionBtnText, { color: Colors.textSecondary }]}>Edit</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Student Groups"
        rightAction={{
          icon: 'add-circle',
          label: 'New Group',
          onPress: () => navigation.navigate('GroupForm', {}),
        }}
      />

      {/* Filter / Toggle Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, !showArchived && styles.filterChipActive]}
          onPress={() => setShowArchived(false)}
        >
          <Text style={[styles.filterChipText, !showArchived && styles.filterChipTextActive]}>
            Active Groups
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, showArchived && styles.filterChipActive]}
          onPress={() => setShowArchived(true)}
        >
          <Text style={[styles.filterChipText, showArchived && styles.filterChipTextActive]}>
            All (Incl. Archived)
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingScreen message="Loading groups..." />
      ) : groups.length === 0 ? (
        <EmptyState
          icon="layers-outline"
          title="No Groups Found"
          description={
            showArchived
              ? 'No groups found in database.'
              : 'Create groups such as Group 1, Group 2, or Level-based groups to organize students.'
          }
          actionTitle="Create First Group"
          onActionPress={() => navigation.navigate('GroupForm', {})}
        />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroupItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryLight,
  },
  filterChipText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  groupCard: {
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  groupName: {
    ...Typography.titleSmall,
    color: Colors.text,
  },
  badgeContainer: {
    marginLeft: Spacing.sm,
  },
  studentCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  studentCountText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },
  groupDesc: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: Spacing.xs,
  },
  actionBtnText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.primary,
  },
});
