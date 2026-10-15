import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { Colors, Spacing, Typography, BorderRadius } from '../../config/theme';
import { Student, Group } from '../../types';
import { StudentService } from '../../services/studentService';
import { GroupService } from '../../services/groupService';
import { useFocusEffect } from 'expo-router';
import { useAppNavigation } from '../../navigation/appNavigation';


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

  const renderStudentCard = ({ item }: { item: Student }) => (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('StudentProfile', { studentId: item.id })}
    >
      <View style={styles.cardRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.fullName.charAt(0).toUpperCase()}</Text>
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
              <Text style={styles.metaText}>Roll: {item.admissionNumber} • </Text>
            ) : null}
            <Text style={styles.metaText}>{item.groupName || 'No Group'}</Text>
          </View>

          {item.guardianName || item.contactPhone ? (
            <Text style={styles.guardianText} numberOfLines={1}>
              {item.guardianName ? `Guardian: ${item.guardianName}` : ''}
              {item.guardianName && item.contactPhone ? ' • ' : ''}
              {item.contactPhone || ''}
            </Text>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </View>
    </Card>
  );

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
          <TouchableOpacity
            style={[styles.pill, selectedGroupId === null && styles.pillActive]}
            onPress={() => setSelectedGroupId(null)}
          >
            <Text
              style={[styles.pillText, selectedGroupId === null && styles.pillTextActive]}
            >
              All Groups
            </Text>
          </TouchableOpacity>

          {groups.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[styles.pill, selectedGroupId === g.id && styles.pillActive]}
              onPress={() => setSelectedGroupId(g.id)}
            >
              <Text
                style={[styles.pillText, selectedGroupId === g.id && styles.pillTextActive]}
              >
                {g.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Active vs Archived Toggle Bar */}
      <View style={styles.subFilterBar}>
        <Text style={styles.countText}>
          {students.length} {students.length === 1 ? 'student' : 'students'} found
        </Text>
        <TouchableOpacity
          style={styles.archiveToggle}
          onPress={() => setShowArchived((prev) => !prev)}
        >
          <Ionicons
            name={showArchived ? 'checkbox' : 'square-outline'}
            size={16}
            color={Colors.primary}
          />
          <Text style={styles.archiveToggleText}>Show Archived</Text>
        </TouchableOpacity>
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
    paddingTop: Spacing.md,
    backgroundColor: Colors.surface,
  },
  searchInput: {
    marginBottom: 0,
  },
  pillsContainer: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pillsScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  pillTextActive: {
    color: Colors.textInverse,
    fontWeight: '700',
  },
  subFilterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  countText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  archiveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  archiveToggleText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.xs,
    gap: Spacing.sm,
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
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.titleMedium,
    color: Colors.primary,
    fontWeight: '700',
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  name: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  metaText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  guardianText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
});
