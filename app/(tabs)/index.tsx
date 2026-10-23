import React, { useState, useMemo, useCallback } from 'react';
import {
    StyleSheet,
    FlatList,
    View,
    Text,
    TouchableOpacity,
    Share,
    Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { getCurrentViewerId, loadExploreFeed, loadFollowingAuthorIds } from '../../api/integration/newui-gateway';
import { setRemoteCommunityLike, setRemoteCommunitySave } from '../../api/services/community/community-supabase';
import { deleteRemoteCommunityPost } from '../../api/services/community/community-post-actions';
import { setUserFollowing } from '../../api/services/community/social-supabase';

import PostCard, { PostCardProps } from '../../components/PostCard';
import TeamPostCard, { TeamPostCardProps } from '../../components/TeamPostCard';
import SearchBarHeader from '../../components/SearchBarHeader';

export type SubTabType = 'EXPLORE' | 'FOLLOWING';

export type FeedItem =
    | ({ itemType: 'POST'; id: string; authorId?: string; isFollowing?: boolean; authorIdentityVerified?: boolean; isOwnPost?: boolean } & PostCardProps)
    | ({ itemType: 'TEAM'; id: string; isFollowing?: boolean } & TeamPostCardProps);

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const bottomMargin = Math.max(insets.bottom + 20, 16);

    const [subTab, setSubTab] = useState<SubTabType>('EXPLORE');
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const [followedAuthorIds, setFollowedAuthorIds] = useState<Set<string>>(() => new Set());
    const [busy, setBusy] = useState(true);
    const [feedError, setFeedError] = useState('');
    const [renderVersion, setRenderVersion] = useState(0);

    const refresh = useCallback(async () => {
        setBusy(true);
        setFeedError('');
        try {
            const [explore, authorIds, viewerId] = await Promise.all([
                loadExploreFeed(),
                loadFollowingAuthorIds(),
                getCurrentViewerId(),
            ]);
            const next = explore.map((item) => ({
                ...item,
                isFollowing: item.itemType === 'POST' && Boolean(item.authorId && authorIds.has(item.authorId)),
                showFollowButton: item.itemType !== 'POST' || item.authorId !== viewerId,
                isOwnPost: item.itemType === 'POST' && item.authorId === viewerId,
            })) as FeedItem[];
            setFeedItems(next);
            setFollowedAuthorIds(new Set(authorIds));
            setRenderVersion((version) => version + 1);
            if (__DEV__) {
                const namesByOwner = new Map<string, Set<string>>();
                for (const item of next) {
                    if (item.itemType !== 'POST' || !item.authorId) continue;
                    const labels = namesByOwner.get(item.authorId) ?? new Set<string>();
                    labels.add(item.username ?? '');
                    namesByOwner.set(item.authorId, labels);
                }
                const inconsistentOwners = [...namesByOwner.values()].filter((labels) => labels.size > 1).length;
                if (inconsistentOwners) {
                    console.warn(`[TrekkEZ Following] ${inconsistentOwners} owner_id(s) are displayed using multiple author names. Verify community_posts.owner_id and author against real profiles.`);
                }
            }
        } catch (error) {
            setFeedItems([]);
            setFollowedAuthorIds(new Set());
            setFeedError(error instanceof Error ? error.message : String(error));
        } finally {
            setBusy(false);
        }
    }, []);
    useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

    // Search States
    const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');

    const filteredItems = useMemo(() => {
        let items = feedItems;

        if (subTab === 'FOLLOWING') {
            items = items.filter((item) =>
                item.itemType === 'POST' &&
                Boolean(item.authorId && followedAuthorIds.has(item.authorId) && item.authorIdentityVerified !== false)
            );
        }

        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            items = items.filter((item) => {
                const matchUsername = item.username?.toLowerCase().includes(query);
                const matchCaption = item.caption?.toLowerCase().includes(query);
                const matchTeamName = item.itemType === 'TEAM' && item.teamName?.toLowerCase().includes(query);
                const matchTags = item.itemType === 'POST' && item.tags?.some((t) => t.toLowerCase().includes(query));

                return matchUsername || matchCaption || matchTeamName || matchTags;
            });
        }

        return items;
    }, [subTab, feedItems, followedAuthorIds, searchQuery]);

    const handleToggleFollow = async (item: FeedItem) => {
        if (item.itemType !== 'POST' || !item.authorId) {
            setFeedError('Không tìm thấy tác giả để theo dõi.');
            return;
        }
        if (item.isOwnPost) return;
        try {
            await setUserFollowing(item.authorId, !item.isFollowing);
            await refresh();
        } catch (error) {
            setFeedError(error instanceof Error ? error.message : String(error));
        }
    };

    const handlePostAction = async (
        item: Extract<FeedItem, { itemType: 'POST' }>,
        action: 'like' | 'save',
    ) => {
        try {
            if (action === 'like') {
                await setRemoteCommunityLike(item.id, !item.isLiked);
            } else {
                await setRemoteCommunitySave(item.id, !item.isBookmarked);
            }
            await refresh();
        } catch (error) {
            setFeedError(error instanceof Error ? error.message : String(error));
        }
    };

    const handleDeletePost = async (item: Extract<FeedItem, { itemType: 'POST' }>) => {
        if (!item.isOwnPost) {
            throw new Error('Bạn chỉ có thể xóa bài viết của chính mình.');
        }
        const viewerId = await getCurrentViewerId();
        await deleteRemoteCommunityPost(item.id, viewerId);
        setFeedItems((current) => current.filter((feedItem) => feedItem.id !== item.id));
    };

    const handleCancelSearch = () => {
        setSearchQuery('');
        setIsSearchActive(false);
    };

    const handleCreatePost = () => {
        router.push('/create-post');
    };

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* --- SHARED INTERACTIVE SEARCH HEADER --- */}
            <View style={styles.headerPadding}>
                <SearchBarHeader
                    title="HOME"
                    placeholder="Search posts, users, tags..."
                    isSearching={isSearchActive}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    onStartSearch={() => setIsSearchActive(true)}
                    onCancelSearch={handleCancelSearch}
                    onNotificationsPress={() => router.push('/notifications')}
                />
            </View>

            <View style={styles.tabToggleRow}>
                <TouchableOpacity
                    style={[
                        styles.tabBtn,
                        subTab === 'EXPLORE' ? styles.tabBtnActive : styles.tabBtnInactive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setSubTab('EXPLORE')}
                >
                    <Text
                        style={[
                            styles.tabBtnText,
                            subTab === 'EXPLORE' ? styles.tabTextActive : styles.tabTextInactive,
                        ]}
                    >
                        EXPLORE
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.tabBtn,
                        subTab === 'FOLLOWING' ? styles.tabBtnActive : styles.tabBtnInactive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setSubTab('FOLLOWING')}
                >
                    <Text
                        style={[
                            styles.tabBtnText,
                            subTab === 'FOLLOWING' ? styles.tabTextActive : styles.tabTextInactive,
                        ]}
                    >
                        FOLLOWING
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.dashedLine} />
            {feedError ? <Text style={{ color: '#B91C1C', paddingHorizontal: 24, paddingBottom: 8 }} selectable>{feedError}</Text> : null}
        </View>
    );

    const renderFeedItem = ({ item }: { item: FeedItem }) => {
        if (item.itemType === 'TEAM') {
            return (
                <View style={styles.cardItemWrapper}>
                    <TeamPostCard
                        {...item}
                        onFollowPress={() => setFeedError('Theo dõi nhóm chưa được hỗ trợ.')}
                        onPressTeamCard={() => router.push('/(tabs)/team')}
                    />
                </View>
            );
        }

        return (
            <View style={styles.cardItemWrapper}>
                <PostCard
                    key={`${item.id}-${renderVersion}`}
                    {...item}
                    showPostOptions={item.isOwnPost}
                    onDeletePress={() => handleDeletePost(item)}
                    onLikePress={() => { void handlePostAction(item, 'like'); }}
                    onBookmarkPress={() => { void handlePostAction(item, 'save'); }}
                    onFollowPress={() => { void handleToggleFollow(item); }}
                    onAuthorPress={item.authorId ? () => router.push({
                        pathname: '/profilepub',
                        params: { id: item.authorId },
                    }) : undefined}
                    onCommentPress={() => router.push({ pathname: '/comments', params: { postId: item.id } })}
                    onSharePress={() => {
                        const message = `TrekkEZ: ${item.caption || ''}`;
                        if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
                            void (navigator.share
                                ? navigator.share({ text: message })
                                : navigator.clipboard.writeText(message)
                            ).catch((error) => setFeedError(String(error)));
                        } else {
                            void Share.share({ message }).catch((error) => setFeedError(String(error)));
                        }
                    }}
                />
            </View>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.sadIconCircle}>
                <Octicons
                    name={searchQuery.trim() ? 'search' : 'rss'}
                    size={40}
                    color="#94A3B8"
                />
            </View>
            <Text style={styles.emptyTitle}>
                {searchQuery.trim() ? 'No posts found' : 'No posts in this feed'}
            </Text>
            <Text style={styles.emptySubtitle}>
                {searchQuery.trim()
                    ? `No matching results for "${searchQuery}". Try different keywords.`
                    : subTab === 'FOLLOWING'
                        ? 'Follow more explorers to see their updates here.'
                        : 'Be the first to share your journey with the community!'}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                refreshing={busy}
                onRefresh={() => { void refresh(); }}
                style={styles.feedList}
                data={filteredItems}
                keyExtractor={(item, index) => item.id ?? index.toString()}
                ListHeaderComponent={renderHeader}
                renderItem={renderFeedItem}
                ListEmptyComponent={renderEmpty}
                ItemSeparatorComponent={() => <View style={styles.dashedSeparator} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            />

            {/* --- FAB NÚT CỘNG ĐĂNG BÀI --- */}
            <View style={[styles.fabContainer, { bottom: bottomMargin + 70 }]}>
                <TouchableOpacity
                    style={styles.fabBtn}
                    activeOpacity={0.85}
                    onPress={handleCreatePost}
                >
                    <Octicons name="plus" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    feedList: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    listContent: {
        paddingHorizontal: 0,
        paddingTop: 16,
        paddingBottom: 110,
        backgroundColor: '#F8FAFC',
    },
    headerContainer: {
        width: '100%',
        backgroundColor: '#F8FAFC',
    },
    headerPadding: {
        paddingHorizontal: 24,
    },
    tabToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 16,
    },
    tabBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 9999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabBtnActive: {
        backgroundColor: '#334155',
    },
    tabBtnInactive: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    tabBtnText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    tabTextActive: {
        color: '#FFFFFF',
    },
    tabTextInactive: {
        color: '#0F172A',
    },
    dashedLine: {
        borderBottomWidth: 1,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        marginHorizontal: 24,
        marginBottom: 16,
    },
    dashedSeparator: {
        borderBottomWidth: 1,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        marginHorizontal: 24,
        marginVertical: 12,
    },
    cardItemWrapper: {
        width: '100%',
    },
    fabContainer: {
        position: 'absolute',
        right: '8%',
        zIndex: 999,
    },
    fabBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#50C1FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 24,
    },
    sadIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 18,
        color: '#334155',
        textAlign: 'center',
        marginBottom: 8,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    emptySubtitle: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 20,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
});