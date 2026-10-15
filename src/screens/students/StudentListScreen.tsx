import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Chip } from '../../components/common/Chip';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { FadeInView } from '../../components/common/Motion';
import { Colors, Spacing, Typography, BorderRadius, Fonts } from '../../config/theme';
import { Student, Group } from '../../types';
import { StudentService } from '../../services/studentService';
import { GroupService } from '../../services/groupService';
import { useFocusEffect } from 'expo-router';
import { useAppNavigation } from '../../navigation/appNavigation';
import { avatarTone, initialsOf } from '../../utils/avatar';

export const StudentListScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allGroups, studentData] = await Promise.all([
        GroupService.getGroups(false),
        StudentService.getStudents({
          search: search.trim() || undefined,
          groupId: selectedGroupId || undefined,
          includeArchived: showArchived,
        }),
      ]);
      setGroups(allGroups);
      setStudents(studentData);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedGroupId, showArchived]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const renderStudentCard = ({ item, index }: { item: Student; index: number }) => {
    const tone = avatarTone(item.fullName);
    return (
      <FadeInView index={index}>
        <Card
          style={styles.card}
          onPress={() => navigation.navigate('StudentProfile', { studentId: item.id })}
        >
          <View style={styles.cardRow}>
            <View style={[styles.avatar, { backgroundColor: tone.bg }]}>
              <Text style={[styles.avatarText, { color: tone.fg }]}>
                {initialsOf(item.fullName)}
              </Text>
            </View>

            <View style={styles.infoCol}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.fullName}
                </Text>
                {item.isArchived ? (
                  <Badge type="archived" size="sm" />
                ) : !item.isActive ? (
                  <Badge type="inactive" size="sm" />
                ) : null}
              </View>

              <View style={styles.detailsRow}>
                {item.admissionNumber ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="id-card-outline" size={12} color={Colors.textMuted} />
                    <Text style={styles.metaText} numberOfLines={1}>
                      Roll: {item.admissionNumber}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.metaItem}>
                  <Ionicons name="layers-outline" size={12} color={Colors.textMuted} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {item.groupName || 'No Group'}
                  </Text>
                </View>
              </View>

              {item.guardianName || item.contactPhone ? (
                <Text style={styles.guardianText} numberOfLines={1}>
                  {item.guardianName ? `Guardian: ${item.guardianName}` : ''}
                  {item.guardianName && item.contactPhone ? '  •  ' : ''}
                  {item.contactPhone || ''}
                </Text>
              ) : null}
            </View>

            <View style={styles.chevronWrap}>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </View>
          </View>
        </Card>
      </FadeInView>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Students"
        rightAction={{
          icon: 'person-add',
          label: 'Register',
          onPress: () => navigation.navigate('StudentForm', {}),
        }}
      />

      {/* Search Input */}
      <View style={styles.searchSection}>
        <Input
          placeholder="Search by name, roll number, or guardian..."
          value={search}
          onChangeText={setSearch}
          leftIcon="search-outline"
          rightIcon={search ? 'close-circle' : undefined}
          onRightIconPress={() => setSearch('')}
          containerStyle={styles.searchInput}
        />
      </View>

      {/* Group Pills Horizontal Scroll */}
      <View style={styles.pillsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsScroll}
        >
          <Chip
            label="All Groups"
            icon="apps-outline"
            selected={selectedGroupId === null}
            onPress={() => setSelectedGroupId(null)}
          />
          {groups.map((g) => (
            <Chip
              key={g.id}
              label={g.name}
              selected={selectedGroupId === g.id}
              onPress={() => setSelectedGroupId(g.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Active vs Archived Toggle Bar */}
      <View style={styles.subFilterBar}>
        <Text style={styles.countText}>
          {students.length} {students.length === 1 ? 'student' : 'students'} found
        </Text>
        <Chip
          label="Show Archived"
          icon={showArchived ? 'checkmark-circle' : 'archive-outline'}
          selected={showArchived}
          onPress={() => setShowArchived((prev) => !prev)}
          style={styles.archiveChip}
        />
      </View>

      {/* Student List */}
      {loading ? (
        <LoadingScreen message="Loading students..." />
      ) : students.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No Students Found"
          description={
            search || selectedGroupId
              ? 'No students match your filter or search query.'
              : 'Register your first student to begin tracking learning progress and daily attendance.'
          }
          actionTitle="Register New Student"
          onActionPress={() => navigation.navigate('StudentForm', {})}
        />
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={renderStudentCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={loadData}
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
  searchSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  searchInput: {
    marginBottom: 0,
  },
  pillsContainer: {
    paddingTop: Spacing.md,
  },
  pillsScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  subFilterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  countText: {
    ...Typography.overline,
    color: Colors.textSecondary,
  },
  archiveChip: {
    height: 32,
    paddingHorizontal: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  card: {
    padding: Spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    letterSpacing: 0.3,
  },
  infoCol: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    ...Typography.titleSmall,
    fontFamily: Fonts.bold,
    flexShrink: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: Spacing.md,
    rowGap: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...Typography.bodySmall,
    fontFamily: Fonts.medium,
  },
  guardianText: {
    ...Typography.caption,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
