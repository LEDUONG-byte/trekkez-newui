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
import { useFocusEffect, router } from 'expo-router';
import { loadExploreFeed, loadFollowingAuthorIds } from '../../api/integration/newui-gateway';
import { setRemoteCommunityLike, setRemoteCommunitySave } from '../../api/services/community/community-supabase';
import { setUserFollowing } from '../../api/services/community/social-supabase';

import PostCard, { PostCardProps } from '../../components/PostCard';
import TeamPostCard, { TeamPostCardProps } from '../../components/TeamPostCard';
import SearchBarHeader from '../../components/SearchBarHeader';

export type SubTabType = 'EXPLORE' | 'FOLLOWING';

export type FeedItem =
    | ({ itemType: 'POST'; id: string; authorId?: string; isFollowing?: boolean; authorIdentityVerified?: boolean } & PostCardProps)
    | ({ itemType: 'TEAM'; id: string; isFollowing?: boolean } & TeamPostCardProps);

const MOCK_FEED_ITEMS: FeedItem[] = [
    {
        id: '1',
        itemType: 'POST',
        avatar: require('../../assets/images/logoW.png'),
        username: 'cat_lover_99',
        isFollowing: false,
        images: [
            require('../../assets/images/onboarding1.png'),
            require('../../assets/images/onboarding2.png'),
        ],
        tags: ['Đà Lạt', 'Trekking', '12km', 'Camping'],
        likeCount: 124,
        commentCount: 18,
        caption: 'Hành trình săn mây buổi sáng cùng đồng đội cực kỳ chất lượng!',
    },
    {
        id: 'team_1',
        itemType: 'TEAM',
        username: 'sixseven_leader',
        avatar: require('../../assets/images/logoW.png'),
        teamName: 'Sixseven Team',
        memberCount: 1,
        maxMembers: 10,
        isJoined: false,
        isFollowing: false,
        caption: 'Tìm thêm các bạn đồng hành đi chinh phục Bạch Mộc Lương Tử cuối tuần này nhé!',
    },
    {
        id: '2',
        itemType: 'POST',
        avatar: require('../../assets/images/logoW.png'),
        username: 'trekkEZ_official',
        isFollowing: true,
        images: [
            require('../../assets/images/onboarding2.png'),
        ],
        tags: ['Tà Năng - Phan Dũng'],
        likeCount: 512,
        commentCount: 42,
        caption: 'Cung đường xinh đẹp nhất mùa mưa này. Đăng ký nhóm ngay tại tab Team!',
    },
    {
        id: 'team_2',
        itemType: 'TEAM',
        username: 'ha_giang_lover',
        avatar: require('../../assets/images/logoW.png'),
        teamName: 'Mã Pí Lèng Explorers',
        memberCount: 6,
        maxMembers: 8,
        isJoined: true,
        isFollowing: true,
        caption: 'Đã đủ nhóm phượt Hà Giang ngắm hoa tam giác mạch.',
    },
];

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const bottomMargin = Math.max(insets.bottom + 20, 16);

    const [subTab, setSubTab] = useState<SubTabType>('EXPLORE');
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const [followedAuthorIds, setFollowedAuthorIds] = useState<Set<string>>(() => new Set());
    const [busy, setBusy] = useState(true);
    const [feedError, setFeedError] = useState('');
    const [renderVersion, setRenderVersion] = useState(0);
    const refresh = useCallback(async () => {
        setBusy(true); setFeedError('');
        try {
            const [explore, authorIds] = await Promise.all([loadExploreFeed(), loadFollowingAuthorIds()]);
            // Follow is a relationship to an AUTHOR (not a post or team card).
            const next: FeedItem[] = explore.map((p) => ({
                ...p,
                isFollowing: p.itemType === 'POST' && Boolean(p.authorId && authorIds.has(p.authorId)),
            })) as FeedItem[];
            setFollowedAuthorIds(new Set(authorIds));
            setFeedItems(next);
            if (__DEV__) {
                const namesByOwner = new Map<string, Set<string>>();
                for (const item of next) {
                    if (item.itemType !== 'POST' || !item.authorId) continue;
                    const labels = namesByOwner.get(item.authorId) ?? new Set<string>();
                    labels.add(item.username ?? '');
                    namesByOwner.set(item.authorId, labels);
                }
                const inconsistentOwners = [...namesByOwner.values()].filter((labels) => labels.size > 1).length;
                console.log(`[TrekkEZ Following] Following: ${authorIds.size} user(s); Explore: ${next.filter((p) => p.itemType === 'POST').length} post(s); Following: ${next.filter((p) => p.itemType === 'POST' && p.authorId && authorIds.has(p.authorId) && p.authorIdentityVerified !== false).length} post(s)`);
                if (inconsistentOwners) console.warn(`[TrekkEZ Following] ${inconsistentOwners} owner_id(s) are displayed using multiple author names. Verify community_posts.owner_id and author against real profiles.`);
            }
            setRenderVersion((v) => v + 1);
        } catch (error) {
            setFeedItems([]);
            setFollowedAuthorIds(new Set());
            setFeedError(error instanceof Error ? error.message : String(error));
        } finally { setBusy(false); }
    }, []);
    useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

    const filteredItems = useMemo(() => {
        // The Following tab must use authoritative user_follows IDs,
        // not PostCard's optimistic local "Following" button state.
        const scope = subTab === 'FOLLOWING'
            ? feedItems.filter((item) => item.itemType === 'POST' && Boolean(item.authorId && followedAuthorIds.has(item.authorId) && item.authorIdentityVerified !== false))
            : feedItems;
        const query = searchQuery.trim().toLocaleLowerCase();
        if (!query) return scope;
        return scope.filter((item) =>
            item.username?.toLocaleLowerCase().includes(query) ||
            item.caption?.toLocaleLowerCase().includes(query) ||
            (item.itemType === 'POST' && item.tags?.some((tag) => tag.toLocaleLowerCase().includes(query))) ||
            (item.itemType === 'TEAM' && item.teamName?.toLocaleLowerCase().includes(query))
        );
    }, [subTab, feedItems, followedAuthorIds, searchQuery]);

    const handleToggleFollow = async (item: FeedItem) => {
        if (item.itemType !== 'POST' || !item.authorId) {
            setFeedError('Chưa có tài khoản tác giả để theo dõi.'); return;
        }
        try {
            await setUserFollowing(item.authorId, !item.isFollowing);
            await refresh();
        } catch (error) { const message = error instanceof Error ? error.message : String(error); await refresh(); setFeedError(message); }
    };
    const handlePostAction = async (item: Extract<FeedItem, { itemType: 'POST' }>, action: 'like' | 'save') => {
        try {
            if (action === 'like') await setRemoteCommunityLike(item.id, !item.isLiked);
            else await setRemoteCommunitySave(item.id, !item.isBookmarked);
            await refresh();
        } catch (error) { const message = error instanceof Error ? error.message : String(error); await refresh(); setFeedError(message); }
    };

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <SearchBarHeader
                title="HOME"
                placeholder="Search posts, users, tags..."
                isSearching={isSearchActive}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                onStartSearch={() => setIsSearchActive(true)}
                onCancelSearch={() => { setIsSearchActive(false); setSearchQuery(''); }}
                containerStyle={styles.inlineSearchHeader}
            />

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
                        onFollowPress={() => setFeedError('Team follow is not connected.')}
                        onPressTeamCard={() => router.push('/(tabs)/team')}
                    />
                </View>
            );
        }

        return (
            <View style={styles.cardItemWrapper}>
                    <PostCard
                        key={`${item.id}-${renderVersion}-${item.isFollowing ? 1 : 0}`}
                        {...item}
                        onLikePress={() => { void handlePostAction(item, 'like'); }}
                        onBookmarkPress={() => { void handlePostAction(item, 'save'); }}
                        onFollowPress={() => { void handleToggleFollow(item); }}
                    onCommentPress={() => router.push({ pathname: '/comments', params: { postId: item.id } })}
                    onSharePress={() => { const message = `TrekkEZ: ${item.caption || ''}`; if (Platform.OS === 'web' && typeof navigator !== 'undefined') { void (navigator.share ? navigator.share({text:message}) : navigator.clipboard.writeText(message)).catch(error=>setFeedError(String(error))); } else { void Share.share({message}).catch(error=>setFeedError(String(error))); } }}
                />
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                refreshing={busy}
                onRefresh={() => { void refresh(); }}
                ListEmptyComponent={!busy ? <Text style={{ color: '#64748B', padding: 24 }}>{searchQuery.trim() ? 'Không tìm thấy bài đăng phù hợp.' : 'Không có bài đăng để hiển thị.'}</Text> : null}
                style={styles.feedList}
                data={filteredItems}
                keyExtractor={(item, index) => item.id ?? index.toString()}
                ListHeaderComponent={renderHeader()}
                renderItem={renderFeedItem}
                ItemSeparatorComponent={() => <View style={styles.dashedSeparator} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            />

            <View style={[styles.fabContainer, { bottom: bottomMargin + 70 }]}>
                <TouchableOpacity style={styles.fabBtn} activeOpacity={0.85}
                    onPress={() => router.push('/create-post')}>
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
    inlineSearchHeader: { marginHorizontal: 24 },
    headerContainer: {
        width: '100%',
        backgroundColor: '#F8FAFC',
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    headerTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 22,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    headerRightBtns: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    circleHeaderBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 10,
    },
    searchResultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        gap: 12,
    },
    searchAvatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1E293B',
    },
    searchInfoCol: {
        flex: 1,
    },
    searchUsernameText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#0F172A',
    },
    searchCaptionText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
});