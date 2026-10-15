import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { Colors, Spacing, Typography, BorderRadius } from '../../config/theme';
import { Book } from '../../types';
import { BookService } from '../../services/bookService';
import { useAppNavigation } from '../../navigation/appNavigation';

export const BookListScreen: React.FC = () => {
  const navigation = useAppNavigation();
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

  const renderBook = ({ item }: { item: Book }) => {
    const index = activeBooks.findIndex((b) => b.id === item.id);
    return (
      <Card
        style={[styles.card, item.isArchived && styles.cardArchived]}
        onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
      >
        <View style={styles.row}>
          <View style={styles.iconCircle}>
            <Ionicons name="book-outline" size={22} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>
              {item.chapterCount ?? 0} {item.chapterCount === 1 ? 'chapter' : 'chapters'}
              {item.isArchived ? ' · removed' : ''}
            </Text>
            {item.nextBookTitle ? (
              <Text style={styles.next}>Next: {item.nextBookTitle}</Text>
            ) : null}
          </View>
          {!item.isArchived ? (
            <>
              <TouchableOpacity
                style={styles.iconBtn}
                disabled={index <= 0}
                onPress={() => handleMove(item.id, 'up')}
              >
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={index <= 0 ? Colors.border : Colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                disabled={index === activeBooks.length - 1}
                onPress={() => handleMove(item.id, 'down')}
              >
                <Ionicons
                  name="arrow-down"
                  size={18}
                  color={index === activeBooks.length - 1 ? Colors.border : Colors.textSecondary}
                />
              </TouchableOpacity>
            </>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </View>
      </Card>
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
          <TouchableOpacity
            key={String(archived)}
            style={[styles.chip, showArchived === archived && styles.chipActive]}
            onPress={() => setShowArchived(archived)}
          >
            <Text style={[styles.chipText, showArchived === archived && styles.chipTextActive]}>
              {archived ? 'Include removed' : 'Active books'}
            </Text>
          </TouchableOpacity>
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
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Book</Text>
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
                style={{ flex: 1 }}
              />
              <Button title="Create" onPress={handleCreate} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
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
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
  },
  chipActive: {
    backgroundColor: Colors.primaryLight,
  },
  chipText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    padding: Spacing.md,
  },
  cardArchived: {
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.titleSmall,
  },
  meta: {
    ...Typography.bodySmall,
  },
  next: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  iconBtn: {
    padding: 6,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  modalTitle: {
    ...Typography.titleSmall,
    marginBottom: Spacing.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
