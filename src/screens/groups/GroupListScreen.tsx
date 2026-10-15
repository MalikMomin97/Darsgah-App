import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Chip } from '../../components/common/Chip';
import { IconCircle } from '../../components/common/IconCircle';
import { FadeInView, PressableScale } from '../../components/common/Motion';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { Colors, Spacing, Typography, BorderRadius, Fonts } from '../../config/theme';
import { Group } from '../../types';
import { GroupService } from '../../services/groupService';
import { useFocusEffect } from 'expo-router';
import { useAppNavigation } from '../../navigation/appNavigation';

/** Rotating token tints for group medallions. */
const GROUP_TONES = [
  { fg: Colors.primary, bg: Colors.primaryLight },
  { fg: Colors.accentDark, bg: Colors.accentLight },
  { fg: Colors.info, bg: Colors.infoLight },
  { fg: Colors.holiday, bg: Colors.holidayBg },
];

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

  const renderGroupItem = ({ item, index }: { item: Group; index: number }) => {
    const tone = GROUP_TONES[index % GROUP_TONES.length];
    return (
      <FadeInView index={index}>
        <Card
          style={styles.groupCard}
          onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
        >
          <View style={styles.cardHeader}>
            <IconCircle icon="layers" size={46} square color={tone.fg} bg={tone.bg} />
            <View style={styles.titleCol}>
              <View style={styles.titleWrap}>
                <Text style={styles.groupName} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.isArchived ? <Badge type="archived" size="sm" /> : null}
              </View>
              <View style={styles.studentCountRow}>
                <Ionicons name="people" size={13} color={Colors.textMuted} />
                <Text style={styles.studentCountText}>
                  {item.studentCount ?? 0} {item.studentCount === 1 ? 'Student' : 'Students'}
                </Text>
              </View>
            </View>
            <View style={styles.chevronWrap}>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </View>
          </View>

          {item.description ? (
            <Text style={styles.groupDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.cardFooter}>
            <PressableScale
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => navigation.navigate('DailyAttendance', { groupId: item.id })}
              pressedScale={0.95}
              hapticOnPress
            >
              <Ionicons name="checkbox-outline" size={16} color={Colors.primary} />
              <Text style={styles.actionBtnText}>Take Attendance</Text>
            </PressableScale>

            <PressableScale
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() => navigation.navigate('GroupForm', { groupId: item.id })}
              pressedScale={0.95}
              hapticOnPress
            >
              <Ionicons name="create-outline" size={16} color={Colors.textSecondary} />
              <Text style={[styles.actionBtnText, { color: Colors.textSecondary }]}>Edit</Text>
            </PressableScale>
          </View>
        </Card>
      </FadeInView>
    );
  };

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
        <Chip
          label="Active Groups"
          icon="radio-button-on-outline"
          selected={!showArchived}
          onPress={() => setShowArchived(false)}
        />
        <Chip
          label="All (Incl. Archived)"
          icon="archive-outline"
          selected={showArchived}
          onPress={() => setShowArchived(true)}
        />
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
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  groupCard: {
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  titleCol: {
    flex: 1,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  groupName: {
    ...Typography.titleSmall,
    fontFamily: Fonts.bold,
    fontSize: 17,
    flexShrink: 1,
  },
  studentCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  studentCountText: {
    ...Typography.bodySmall,
    fontFamily: Fonts.medium,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupDesc: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
  },
  actionBtnSecondary: {
    backgroundColor: Colors.surfaceSubtle,
  },
  actionBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    color: Colors.primary,
  },
});
