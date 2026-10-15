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
import { PickerModal } from '../../components/learning/PickerModal';
import { Colors, Spacing, Typography, BorderRadius } from '../../config/theme';
import { Book, Chapter } from '../../types';
import { BookService } from '../../services/bookService';
import { useAppNavigation, useAppRoute } from '../../navigation/appNavigation';

const NO_NEXT_BOOK = '__none__';

type EditorState =
  | { kind: 'book'; title: string; description: string }
  | { kind: 'addChapters'; text: string }
  | { kind: 'renameChapter'; chapterId: string; title: string };

export const BookDetailScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const { bookId } = useAppRoute<'BookDetail'>().params;

  const [book, setBook] = useState<Book | null>(null);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [nextPickerVisible, setNextPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, books, ch] = await Promise.all([
        BookService.getBookById(bookId),
        BookService.getBooks(false),
        BookService.getChapters(bookId),
      ]);
      setBook(b);
      setAllBooks(books);
      setChapters(ch);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load book.');
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const run = async (action: () => Promise<void>) => {
    try {
      setSaving(true);
      await action();
      setEditor(null);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEditor = () => {
    if (!editor || !book) return;
    if (editor.kind === 'book') {
      if (!editor.title.trim()) return Alert.alert('Validation', 'Book name is required.');
      return run(() =>
        BookService.updateBook(book.id, {
          title: editor.title,
          description: editor.description,
          nextBookId: book.nextBookId,
        })
      );
    }
    if (editor.kind === 'addChapters') {
      // One chapter per line, in the order typed
      const titles = editor.text
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean);
      if (titles.length === 0) return Alert.alert('Validation', 'Enter at least one chapter.');
      return run(async () => {
        for (const t of titles) await BookService.addChapter(book.id, t);
      });
    }
    if (!editor.title.trim()) return Alert.alert('Validation', 'Chapter name is required.');
    return run(() => BookService.renameChapter(editor.chapterId, editor.title));
  };

  const handleSetNextBook = (nextId: string) => {
    if (!book) return;
    setNextPickerVisible(false);
    run(() =>
      BookService.updateBook(book.id, {
        title: book.title,
        description: book.description,
        nextBookId: nextId === NO_NEXT_BOOK ? null : nextId,
      })
    );
  };

  const handleRemoveChapter = (chapter: Chapter) => {
    Alert.alert(
      `Remove "${chapter.title}"?`,
      'It will be hidden for all students. Ratings already given are kept in history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => run(() => BookService.archiveChapter(chapter.id)),
        },
      ]
    );
  };

  const handleToggleArchiveBook = () => {
    if (!book) return;
    if (book.isArchived) {
      run(() => BookService.unarchiveBook(book.id));
      return;
    }
    Alert.alert(
      `Remove "${book.title}"?`,
      'It can no longer be assigned. Students who already have it keep it and their history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            run(async () => {
              await BookService.archiveBook(book.id);
              navigation.goBack();
            }),
        },
      ]
    );
  };

  if (loading) return <LoadingScreen message="Loading book..." />;

  if (!book) {
    return (
      <View style={styles.container}>
        <Header title="Book" onBack={navigation.goBack} />
        <EmptyState icon="alert-circle-outline" title="Book not found" description="It may have been deleted." />
      </View>
    );
  }

  const header = (
    <View style={{ gap: Spacing.md }}>
      <Card>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bookTitle}>{book.title}</Text>
            {book.description ? <Text style={styles.meta}>{book.description}</Text> : null}
          </View>
          <TouchableOpacity
            onPress={() =>
              setEditor({ kind: 'book', title: book.title, description: book.description || '' })
            }
            style={styles.iconBtn}
          >
            <Ionicons name="create-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.nextRow} onPress={() => setNextPickerVisible(true)}>
          <Ionicons name="arrow-forward-circle-outline" size={20} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Next book after completion</Text>
            <Text style={styles.nextValue}>{book.nextBookTitle || 'None'}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.hint}>
          When a student completes every chapter, you can promote them to the next book.
        </Text>
      </Card>

      <View style={styles.rowBetween}>
        <Text style={styles.sectionLabel}>Chapters ({chapters.length})</Text>
        <TouchableOpacity onPress={() => setEditor({ kind: 'addChapters', text: '' })}>
          <Text style={styles.link}>+ Add chapters</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header
        title={book.title}
        subtitle={book.isArchived ? 'Removed book' : 'Book'}
        onBack={navigation.goBack}
        rightAction={{
          icon: book.isArchived ? 'refresh-outline' : 'trash-outline',
          label: book.isArchived ? 'Restore' : 'Remove',
          color: book.isArchived ? Colors.primary : Colors.danger,
          onPress: handleToggleArchiveBook,
        }}
      />

      <FlatList
        data={chapters}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            icon="list-outline"
            title="No chapters yet"
            description="Add the chapters of this book in teaching order."
            actionTitle="Add chapters"
            onActionPress={() => setEditor({ kind: 'addChapters', text: '' })}
          />
        }
        renderItem={({ item, index }) => (
          <Card padding="sm" style={styles.chapterCard}>
            <View style={styles.row}>
              <Text style={styles.index}>{index + 1}</Text>
              <Text style={styles.chapterTitle}>{item.title}</Text>
              <IconBtn
                icon="arrow-up"
                disabled={index === 0}
                onPress={() => run(() => BookService.moveChapter(book.id, item.id, 'up'))}
              />
              <IconBtn
                icon="arrow-down"
                disabled={index === chapters.length - 1}
                onPress={() => run(() => BookService.moveChapter(book.id, item.id, 'down'))}
              />
              <IconBtn
                icon="create-outline"
                onPress={() =>
                  setEditor({ kind: 'renameChapter', chapterId: item.id, title: item.title })
                }
              />
              <IconBtn
                icon="trash-outline"
                color={Colors.danger}
                onPress={() => handleRemoveChapter(item)}
              />
            </View>
          </Card>
        )}
      />

      <PickerModal
        visible={nextPickerVisible}
        title="Next book"
        selectedId={book.nextBookId || NO_NEXT_BOOK}
        options={[
          { id: NO_NEXT_BOOK, label: 'None' },
          ...allBooks
            .filter((b) => b.id !== book.id)
            .map((b) => ({ id: b.id, label: b.title, hint: `${b.chapterCount ?? 0} chapters` })),
        ]}
        onSelect={(o) => handleSetNextBook(o.id)}
        onClose={() => setNextPickerVisible(false)}
      />

      <Modal
        visible={editor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditor(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            {editor?.kind === 'book' ? (
              <>
                <Text style={styles.modalTitle}>Edit Book</Text>
                <Input
                  label="Book name"
                  required
                  value={editor.title}
                  onChangeText={(t) => setEditor({ ...editor, title: t })}
                />
                <Input
                  label="Description"
                  value={editor.description}
                  onChangeText={(t) => setEditor({ ...editor, description: t })}
                  placeholder="Optional"
                />
              </>
            ) : editor?.kind === 'addChapters' ? (
              <>
                <Text style={styles.modalTitle}>Add Chapters</Text>
                <Input
                  label="One chapter per line"
                  value={editor.text}
                  onChangeText={(t) => setEditor({ ...editor, text: t })}
                  placeholder={'Chapter 1\nChapter 2\nChapter 3'}
                  multiline
                  numberOfLines={6}
                  autoFocus
                />
              </>
            ) : editor?.kind === 'renameChapter' ? (
              <>
                <Text style={styles.modalTitle}>Rename Chapter</Text>
                <Input
                  label="Chapter name"
                  required
                  value={editor.title}
                  onChangeText={(t) => setEditor({ ...editor, title: t })}
                  autoFocus
                />
              </>
            ) : null}
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setEditor(null)}
                style={{ flex: 1 }}
              />
              <Button title="Save" onPress={handleSaveEditor} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const IconBtn: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}> = ({ icon, onPress, disabled, color = Colors.textSecondary }) => (
  <TouchableOpacity onPress={onPress} disabled={disabled} style={styles.iconBtn}>
    <Ionicons name={icon} size={18} color={disabled ? Colors.border : color} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookTitle: {
    ...Typography.titleMedium,
  },
  meta: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryLight,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  nextValue: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: Colors.primary,
  },
  hint: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  sectionLabel: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  link: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.primary,
  },
  chapterCard: {
    paddingHorizontal: Spacing.md,
  },
  index: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.primary,
    width: 26,
  },
  chapterTitle: {
    ...Typography.bodyLarge,
    flex: 1,
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
