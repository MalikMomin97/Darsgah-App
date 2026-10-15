import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { Chip } from '../../components/common/Chip';
import { IconCircle } from '../../components/common/IconCircle';
import { FadeInView, PressableScale } from '../../components/common/Motion';
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  Fonts,
  Shadows,
  arabicAware,
} from '../../config/theme';
import { Book } from '../../types';
import { BookService } from '../../services/bookService';
import { useAppNavigation } from '../../navigation/appNavigation';

export const BookListScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const [books, setBooks] = useState<Book[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setBooks(await BookService.getBooks(showArchived));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load books.');
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleCreate = async () => {
    if (!newTitle?.trim()) {
      Alert.alert('Validation', 'Book name is required.');
      return;
    }
    try {
      setSaving(true);
      const book = await BookService.createBook({ title: newTitle });
      setNewTitle(null);
      navigation.navigate('BookDetail', { bookId: book.id });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create book.');
    } finally {
      setSaving(false);
    }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    try {
      await BookService.moveBook(id, direction);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to reorder.');
    }
  };

  const activeBooks = books.filter((b) => !b.isArchived);

  const renderBook = ({ item, index: listIndex }: { item: Book; index: number }) => {
    const index = activeBooks.findIndex((b) => b.id === item.id);
    const canMoveUp = index > 0;
    const canMoveDown = index !== activeBooks.length - 1;
    return (
      <FadeInView index={listIndex}>
        <Card
          style={[styles.card, item.isArchived && styles.cardArchived]}
          padding="md"
          onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
        >
          <View style={styles.row}>
            <IconCircle
              icon={item.isArchived ? 'archive-outline' : 'book'}
              color={item.isArchived ? Colors.textMuted : Colors.primary}
              bg={item.isArchived ? Colors.surfaceSubtle : Colors.primaryLight}
              size={50}
              square
            />
            <View style={styles.infoCol}>
              <Text style={[styles.title, arabicAware(item.title, 16)]} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.metaRow}>
                <View style={styles.countPill}>
                  <Ionicons name="layers-outline" size={12} color={Colors.textSecondary} />
                  <Text style={styles.meta}>
                    {item.chapterCount ?? 0} {item.chapterCount === 1 ? 'chapter' : 'chapters'}
                  </Text>
                </View>
                {item.isArchived ? (
                  <View style={[styles.countPill, styles.removedPill]}>
                    <Text style={[styles.meta, { color: Colors.danger }]}>removed</Text>
                  </View>
                ) : null}
              </View>
              {item.nextBookTitle ? (
                <View style={styles.nextRow}>
                  <Ionicons name="arrow-forward-circle" size={14} color={Colors.accent} />
                  <Text style={[styles.next, arabicAware(item.nextBookTitle, 12)]}>
                    Next: {item.nextBookTitle}
                  </Text>
                </View>
              ) : null}
            </View>
            {!item.isArchived ? (
              <View style={styles.reorderCol}>
                <PressableScale
                  style={[styles.iconBtn, !canMoveUp && styles.iconBtnDisabled]}
                  disabled={!canMoveUp}
                  onPress={() => handleMove(item.id, 'up')}
                  pressedScale={0.88}
                  hapticOnPress
                  hitSlop={4}
                  accessibilityLabel="Move up"
                >
                  <Ionicons
                    name="chevron-up"
                    size={16}
                    color={canMoveUp ? Colors.textSecondary : Colors.border}
                  />
                </PressableScale>
                <PressableScale
                  style={[styles.iconBtn, !canMoveDown && styles.iconBtnDisabled]}
                  disabled={!canMoveDown}
                  onPress={() => handleMove(item.id, 'down')}
                  pressedScale={0.88}
                  hapticOnPress
                  hitSlop={4}
                  accessibilityLabel="Move down"
                >
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={canMoveDown ? Colors.textSecondary : Colors.border}
                  />
                </PressableScale>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </View>
        </Card>
      </FadeInView>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Curriculum"
        subtitle="Books and their chapters"
        rightAction={{ icon: 'add-circle', label: 'Add Book', onPress: () => setNewTitle('') }}
      />

      <View style={styles.filterBar}>
        {[false, true].map((archived) => (
          <Chip
            key={String(archived)}
            label={archived ? 'Include removed' : 'Active books'}
            icon={archived ? 'archive-outline' : 'library-outline'}
            selected={showArchived === archived}
            onPress={() => setShowArchived(archived)}
          />
        ))}
      </View>

      {loading ? (
        <LoadingScreen message="Loading books..." />
      ) : (
        <FlatList
          data={books}
          keyExtractor={(b) => b.id}
          renderItem={renderBook}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="book-outline"
              title="No books yet"
              description="Add a book, then add its chapters."
              actionTitle="Add Book"
              onActionPress={() => setNewTitle('')}
            />
          }
        />
      )}

      <Modal
        visible={newTitle !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setNewTitle(null)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <FadeInView style={[styles.sheet, { paddingBottom: Spacing.xl + insets.bottom }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <IconCircle icon="book" color={Colors.primary} bg={Colors.primaryLight} size={48} />
              <View style={styles.sheetHeaderText}>
                <Text style={styles.modalTitle}>Add Book</Text>
                <Text style={styles.modalSub}>You can add its chapters next.</Text>
              </View>
            </View>
            <Input
              label="Book name"
              required
              value={newTitle || ''}
              onChangeText={setNewTitle}
              placeholder="e.g. Diniyat Part 2"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setNewTitle(null)}
                style={styles.modalBtn}
              />
              <Button
                title="Create"
                icon="add"
                onPress={handleCreate}
                loading={saving}
                style={styles.modalBtn}
              />
            </View>
          </FadeInView>
        </KeyboardAvoidingView>
      </Modal>
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
  list: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  card: {},
  cardArchived: {
    opacity: 0.65,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  infoCol: {
    flex: 1,
  },
  title: {
    ...Typography.titleSmall,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 5,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
  },
  removedPill: {
    backgroundColor: Colors.dangerLight,
  },
  meta: {
    ...Typography.caption,
    fontFamily: Fonts.semibold,
    color: Colors.textSecondary,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  next: {
    ...Typography.caption,
    fontFamily: Fonts.bold,
    color: Colors.accentDark,
  },
  reorderCol: {
    gap: 4,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDisabled: {
    backgroundColor: Colors.surface,
  },

  // Add-book sheet
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
    ...Shadows.lg,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.borderDark,
    marginBottom: Spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  sheetHeaderText: {
    flex: 1,
  },
  modalTitle: {
    ...Typography.titleMedium,
  },
  modalSub: {
    ...Typography.bodySmall,
    marginTop: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  modalBtn: {
    flex: 1,
  },
});
