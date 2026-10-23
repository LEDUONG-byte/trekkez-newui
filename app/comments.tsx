import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { useLocalSearchParams, useFocusEffect, router } from 'expo-router';
import { getRemoteCommunityComments, uploadCommunityComment } from '../api/services/community/community-supabase';
import { loadProfileOverview } from '../api/integration/newui-gateway';
import type { CommunityComment } from '../api/types/community';

function newId(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function formatCommentTime(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (elapsedMinutes < 1) return 'now';
  if (elapsedMinutes < 60) return `${elapsedMinutes}m`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays}d`;
  return new Date(timestamp).toLocaleDateString();
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || '?';
}

export default function CommentsScreen() {
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const [rows, setRows] = useState<CommunityComment[]>([]);
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!postId) {
      setError('Thiếu mã bài viết.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(await getRemoteCommunityComments(postId));
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [postId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const submit = async () => {
    const commentText = text.trim();
    if (pending || !postId || !commentText) return;
    setPending(true);
    setError('');
    try {
      const profile = await loadProfileOverview();
      const comment: CommunityComment = {
        id: newId(),
        name: profile.fullName || profile.username || 'TrekkEZ',
        text: commentText,
        time: new Date().toISOString(),
        userId: profile.id,
        avatarUrl: profile.avatarUrl || undefined,
      };
      await uploadCommunityComment(postId, comment, profile.id);
      const confirmed = await getRemoteCommunityComments(postId, profile.id);
      if (!confirmed.some((savedComment) => savedComment.id === comment.id)) {
        throw new Error('Supabase chưa xác nhận đã lưu bình luận.');
      }
      setText('');
      setRows(confirmed);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setPending(false);
    }
  };

  const renderComment = ({ item }: { item: CommunityComment }) => (
    <View style={styles.commentRow}>
      <TouchableOpacity
        disabled={!item.userId}
        activeOpacity={0.75}
        onPress={() => item.userId && router.push({ pathname: '/profilepub', params: { id: item.userId } })}
      >
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitials}>{getInitials(item.name)}</Text>
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.commentContent}>
        <Text style={styles.commentText}>
          <Text
            style={styles.commenterName}
            onPress={() => item.userId && router.push({ pathname: '/profilepub', params: { id: item.userId } })}
          >{item.name} </Text>
          {item.text}
        </Text>
        <View style={styles.commentMeta}>
          <Text style={styles.commentTime}>{formatCommentTime(item.time)}</Text>
          <Text style={styles.replyLabel}>Reply</Text>
        </View>
      </View>
      <Octicons name="heart" size={15} color="#64748B" style={styles.commentLikeIcon} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityLabel="Go back"
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Octicons name="chevron-left" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comments</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>All comments</Text>
          <Text style={styles.commentCount}>{rows.length}</Text>
        </View>

        {error ? (
          <Text style={styles.errorText} selectable>{error}</Text>
        ) : null}

        <FlatList
          style={styles.list}
          contentContainerStyle={rows.length === 0 ? styles.emptyList : styles.listContent}
          data={rows}
          keyExtractor={(comment) => comment.id}
          renderItem={renderComment}
          keyboardShouldPersistTaps="handled"
          onRefresh={() => { void load(); }}
          refreshing={loading}
          ListEmptyComponent={loading ? (
            <ActivityIndicator color="#0F172A" />
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Octicons name="comment" size={24} color="#0F172A" />
              </View>
              <Text style={styles.emptyTitle}>No comments yet</Text>
              <Text style={styles.emptySubtitle}>Start the conversation.</Text>
            </View>
          )}
        />

        <View style={styles.composer}>
          <View style={styles.composerAvatar}>
            <Octicons name="person-fill" size={15} color="#64748B" />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor="#94A3B8"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            editable={!pending}
          />
          <TouchableOpacity
            accessibilityLabel="Post comment"
            style={[styles.sendButton, (!text.trim() || pending) && styles.sendButtonDisabled]}
            onPress={() => { void submit(); }}
            disabled={pending || !text.trim()}
          >
            {pending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Octicons name="paper-airplane" size={17} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 36,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSpacer: {
    width: 36,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  commentCount: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    marginHorizontal: 20,
    marginTop: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
  },
  avatarInitials: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '700',
  },
  commentContent: {
    flex: 1,
    paddingHorizontal: 11,
  },
  commentText: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  },
  commenterName: {
    color: '#0F172A',
    fontWeight: '700',
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 7,
  },
  commentTime: {
    color: '#94A3B8',
    fontSize: 12,
  },
  replyLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  commentLikeIcon: {
    marginTop: 5,
    marginRight: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderWidth: 1.5,
    borderColor: '#0F172A',
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 5,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  composerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    marginBottom: 3,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 9,
    color: '#0F172A',
    fontSize: 14,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
});
