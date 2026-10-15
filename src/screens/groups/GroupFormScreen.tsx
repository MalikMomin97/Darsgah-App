import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/common/Header';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { SectionHeader } from '../../components/common/SectionHeader';
import { IconCircle } from '../../components/common/IconCircle';
import { FadeInView } from '../../components/common/Motion';
import { Colors, Spacing, Typography, Shadows } from '../../config/theme';
import { GroupService } from '../../services/groupService';
import { useAppNavigation, useAppRoute } from '../../navigation/appNavigation';

export const GroupFormScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const route = useAppRoute<'GroupForm'>();
  const groupId = route.params?.groupId;
  const isEdit = Boolean(groupId);
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isArchived, setIsArchived] = useState(false);
  const [loading, setLoading] = useState(Boolean(groupId));
  const [archiveModalVisible, setArchiveModalVisible] = useState(false);

  const loadGroup = async (id: string) => {
    try {
      const grp = await GroupService.getGroupById(id);
      if (grp) {
        setName(grp.name);
        setDescription(grp.description || '');
        setSortOrder(String(grp.sortOrder || 0));
        setIsArchived(grp.isArchived);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load group details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      (async () => await loadGroup(groupId))();
    }
  }, [groupId]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Group name is required.');
      return;
    }

    try {
      setLoading(true);
      const order = parseInt(sortOrder, 10) || 0;
      if (isEdit && groupId) {
        await GroupService.updateGroup(groupId, {
          name: name.trim(),
          description: description.trim() || undefined,
          sortOrder: order,
        });
        Alert.alert('Success', 'Group updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await GroupService.createGroup({
          name: name.trim(),
          description: description.trim() || undefined,
          sortOrder: order,
        });
        Alert.alert('Success', 'Group created successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save group.');
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      if (isArchived) {
        await GroupService.unarchiveGroup(groupId);
        setIsArchived(false);
        Alert.alert('Success', 'Group restored to active list.');
      } else {
        await GroupService.archiveGroup(groupId);
        setIsArchived(true);
        Alert.alert('Success', 'Group archived. Historical student records remain preserved.');
      }
      setArchiveModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to archive/restore group.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title={isEdit ? 'Edit Group' : 'Create Group'}
        subtitle={isEdit ? 'Update group details' : 'Organise students into a group'}
        onBack={() => navigation.goBack()}
      />
      <ScreenContainer scrollable contentContainerStyle={styles.scrollContent}>
        <FadeInView>
          <Card style={styles.formCard}>
            <View style={styles.sectionHead}>
              <IconCircle icon="layers" size={36} square />
              <SectionHeader title="Group Information" style={styles.sectionHeader} />
            </View>

            <Input
              label="Group Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g., Group 1 (Beginners), Tajweed Batch A"
              required
              leftIcon="layers-outline"
            />

            <Input
              label="Description / Purpose"
              value={description}
              onChangeText={setDescription}
              placeholder="e.g., Students studying introductory Noorani Qaida and Taharah"
              multiline
              numberOfLines={3}
              leftIcon="document-text-outline"
            />

            <Input
              label="Display Sort Order"
              value={sortOrder}
              onChangeText={setSortOrder}
              placeholder="e.g., 1, 2, 3"
              keyboardType="numeric"
              helperText="Lower numbers appear first in lists and attendance screens."
              leftIcon="reorder-four-outline"
              containerStyle={styles.lastInput}
            />
          </Card>
        </FadeInView>

        {isEdit && (
          <FadeInView index={1}>
            <Card style={[styles.formCard, styles.archiveCard]}>
              <View style={styles.sectionHead}>
                <IconCircle
                  icon={isArchived ? 'refresh' : 'archive'}
                  size={36}
                  square
                  color={isArchived ? Colors.primary : Colors.danger}
                  bg={isArchived ? Colors.primaryLight : Colors.dangerLight}
                />
                <SectionHeader title="Group Status" style={styles.sectionHeader} />
              </View>
              <Text style={styles.archiveDesc}>
                {isArchived
                  ? 'This group is currently archived. Students in this group remain in the database.'
                  : 'Archiving hides this group from daily active pickers while preserving all past attendance and learning records.'}
              </Text>

              <Button
                title={isArchived ? 'Restore Active Group' : 'Archive Group'}
                variant={isArchived ? 'outline' : 'danger'}
                onPress={() => setArchiveModalVisible(true)}
                icon={isArchived ? 'refresh-outline' : 'archive-outline'}
                fullWidth
              />
            </Card>
          </FadeInView>
        )}
      </ScreenContainer>

      {/* Sticky Save Bar */}
      <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
        <Button
          title={isEdit ? 'Save Changes' : 'Create Group'}
          onPress={handleSave}
          loading={loading}
          icon="checkmark-circle-outline"
          size="lg"
          fullWidth
        />
      </View>

      <ConfirmModal
        visible={archiveModalVisible}
        title={isArchived ? 'Restore Group?' : 'Archive Group?'}
        message={
          isArchived
            ? 'Restore this group back to active daily use?'
            : 'Archiving will remove this group from active attendance selection. All historical records will remain safe.'
        }
        confirmText={isArchived ? 'Yes, Restore' : 'Yes, Archive'}
        confirmVariant={isArchived ? 'primary' : 'danger'}
        onConfirm={handleArchiveToggle}
        onCancel={() => setArchiveModalVisible(false)}
        loading={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  formCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flex: 1,
    marginBottom: 0,
  },
  lastInput: {
    marginBottom: 0,
  },
  archiveCard: {
    borderColor: Colors.borderDark,
  },
  archiveDesc: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.lg,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.lg,
  },
});
