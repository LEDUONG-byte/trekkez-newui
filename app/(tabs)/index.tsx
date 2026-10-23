import React, { useState, useMemo } from 'react';
import {
    StyleSheet,
    FlatList,
    View,
    Text,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import PostCard, { PostCardProps } from '../../components/PostCard';
import TeamPostCard, { TeamPostCardProps } from '../../components/TeamPostCard';
import SearchBarHeader from '../../components/SearchBarHeader';

export type SubTabType = 'EXPLORE' | 'FOLLOWING';

export type FeedItem =
    | ({ itemType: 'POST'; id: string; isFollowing?: boolean } & PostCardProps)
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
    const [feedItems, setFeedItems] = useState<FeedItem[]>(MOCK_FEED_ITEMS);

    // Search States
    const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');

    const filteredItems = useMemo(() => {
        let items = feedItems;

        if (subTab === 'FOLLOWING') {
            items = items.filter((item) => item.isFollowing);
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
    }, [subTab, feedItems, searchQuery]);

    const handleToggleFollow = (id: string) => {
        setFeedItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, isFollowing: !item.isFollowing } : item
            )
        );
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
        </View>
    );

    const renderFeedItem = ({ item }: { item: FeedItem }) => {
        if (item.itemType === 'TEAM') {
            return (
                <View style={styles.cardItemWrapper}>
                    <TeamPostCard
                        {...item}
                        onFollowPress={() => handleToggleFollow(item.id)}
                        onPressTeamCard={() => console.log('Team card pressed:', item.id)}
                    />
                </View>
            );
        }

        return (
            <View style={styles.cardItemWrapper}>
                <PostCard
                    {...item}
                    onFollowPress={() => handleToggleFollow(item.id)}
                    onCommentPress={() => console.log('Comment pressed:', item.id)}
                    onSharePress={() => console.log('Share pressed:', item.id)}
                />
            </View>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.sadIconCircle}>
                <Octicons
                    name={searchQuery.trim() ? 'search' : 'feed'}
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