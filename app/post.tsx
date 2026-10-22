import React, { useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import PostCard, { PostData } from '../components/PostCard';

export interface PostDetailItem extends PostData {
    id: string;
}

const MOCK_POSTS_DETAIL: PostDetailItem[] = [
    {
        id: 'post_1',
        username: 'duong_duong',
        avatar: require('../assets/images/logoW.png'),
        images: [require('../assets/images/onboarding1.png')],
        likeCount: 1,
        commentCount: 1,
        caption: 'Chuyến đi trải nghiệm thực tế tuyệt vời!',
        isFollowing: false,
        tags: ['#outdoor', '#nature', '#trip', '#relax', '#enjoy'],
    },
    {
        id: 'post_2',
        username: 'duong_duong',
        avatar: require('../assets/images/logoW.png'),
        images: [require('../assets/images/onboarding2.png')],
        likeCount: 12,
        commentCount: 3,
        caption: 'Thưởng thức trà chanh chiều nắng ấm.',
        isFollowing: false,
        tags: ['#tea', '#cozy'],
    },
    {
        id: 'post_3',
        username: 'duong_duong',
        avatar: require('../assets/images/logoW.png'),
        images: [require('../assets/images/logoW.png')],
        likeCount: 8,
        commentCount: 0,
        caption: 'Logo dự án mới ra mắt.',
        isFollowing: true,
    },
    {
        id: 'post_4',
        username: 'duong_duong',
        avatar: require('../assets/images/logoW.png'),
        images: [require('../assets/images/onboarding1.png')],
        likeCount: 25,
        commentCount: 5,
        caption: 'Kỷ niệm hành trình.',
        isFollowing: false,
    },
];

export default function PostScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ postId?: string; initialIndex?: string }>();
    const flatListRef = useRef<FlatList>(null);

    const startIndex = params.initialIndex ? parseInt(params.initialIndex, 10) : 0;

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <View style={styles.headerBar}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Octicons name="chevron-left" size={24} color="#0F172A" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>POST</Text>

                <View style={styles.placeholderRight} />
            </View>

            <View style={styles.dashedLine} />
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <FlatList
                ref={flatListRef}
                style={styles.feedList}
                data={MOCK_POSTS_DETAIL}
                keyExtractor={(item, index) => item.id ?? index.toString()}
                initialScrollIndex={startIndex >= 0 && startIndex < MOCK_POSTS_DETAIL.length ? startIndex : 0}
                onScrollToIndexFailed={(info) => {
                    setTimeout(() => {
                        flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
                    }, 100);
                }}
                ListHeaderComponent={renderHeader}
                renderItem={({ item }) => (
                    <View style={styles.cardItemWrapper}>
                        <PostCard {...item} />
                    </View>
                )}
                ItemSeparatorComponent={() => <View style={styles.dashedSeparator} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            />
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
        paddingBottom: 40,
        backgroundColor: '#F8FAFC',
    },
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
    backBtn: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    placeholderRight: {
        width: 36,
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
});