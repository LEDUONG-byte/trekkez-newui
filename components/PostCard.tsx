import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
    FlatList,
    Dimensions,
    ImageSourcePropType,
} from 'react-native';
import { Octicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface PostData {
    id?: string;
    avatar?: ImageSourcePropType | string;
    username?: string;
    isFollowing?: boolean;
    onFollowPress?: () => void;
    images?: (ImageSourcePropType | string)[];
    tags?: string[];
    likeCount?: number;
    commentCount?: number;
    caption?: string;
    isLiked?: boolean;
    isBookmarked?: boolean;
    onLikePress?: () => void;
    onCommentPress?: () => void;
    onSharePress?: () => void;
    onBookmarkPress?: () => void;
}

export interface PostCardProps extends PostData {
    post?: PostData;
}

export default function PostCard(props: PostCardProps) {
    const data = props.post || props;

    const {
        avatar = data.avatar,
        username = data.username ?? 'user',
        isFollowing = data.isFollowing ?? false,
        onFollowPress = data.onFollowPress,
        images = data.images ?? [],
        tags = data.tags ?? [],
        likeCount = data.likeCount ?? 0,
        commentCount = data.commentCount ?? 0,
        caption = data.caption ?? '',
        isLiked: initialIsLiked = data.isLiked ?? false,
        isBookmarked: initialIsBookmarked = data.isBookmarked ?? false,
        onLikePress = data.onLikePress,
        onCommentPress = data.onCommentPress,
        onSharePress = data.onSharePress,
        onBookmarkPress = data.onBookmarkPress,
    } = data;

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isLiked, setIsLiked] = useState(initialIsLiked);
    const [likeNum, setLikeNum] = useState(likeCount);
    const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
    const [following, setFollowing] = useState(isFollowing);

    const handleFollow = () => {
        setFollowing((prev) => !prev);
        if (onFollowPress) onFollowPress();
    };

    const handleLike = () => {
        setIsLiked((prev) => !prev);
        setLikeNum((prev) => (isLiked ? prev - 1 : prev + 1));
        if (onLikePress) onLikePress();
    };

    const handleBookmark = () => {
        setIsBookmarked((prev) => !prev);
        if (onBookmarkPress) onBookmarkPress();
    };

    const safeImages = Array.isArray(images) ? images : [];
    const safeTags = Array.isArray(tags) ? tags : [];

    return (
        <View style={styles.cardContainer}>
            {/* Header: Avatar, Username, Follow Button */}
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    {avatar ? (
                        <Image
                            source={typeof avatar === 'string' ? { uri: avatar } : avatar}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]} />
                    )}
                    <Text style={styles.username}>@{username}</Text>
                </View>

                <TouchableOpacity
                    style={[styles.followButton, following && styles.followingButton]}
                    activeOpacity={0.7}
                    onPress={handleFollow}
                >
                    <Text style={[styles.followText, following && styles.followingText]}>
                        {following ? 'Following' : 'Follow'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Media Section: Image Carousel tràn sát 2 mép màn hình */}
            <View style={styles.mediaContainer}>
                <FlatList
                    data={safeImages}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(_, index) => index.toString()}
                    onMomentumScrollEnd={(e) => {
                        const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                        setCurrentImageIndex(index);
                    }}
                    renderItem={({ item }) => (
                        <Image
                            source={typeof item === 'string' ? { uri: item } : item}
                            style={styles.postImage}
                            resizeMode="cover"
                        />
                    )}
                />

                {/* Badge đếm số ảnh (1/10) */}
                {safeImages.length > 1 && (
                    <View style={styles.imageCounter}>
                        <Text style={styles.imageCounterText}>
                            {currentImageIndex + 1}/{safeImages.length}
                        </Text>
                    </View>
                )}

                {/* Tags nổi trên ảnh */}
                {safeTags.length > 0 && (
                    <View style={styles.tagOverlay}>
                        {safeTags.map((tag, idx) => (
                            <View key={`${tag}-${idx}`} style={styles.tagPill}>
                                <Text style={styles.tagText}>{tag}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* Action Bar */}
            <View style={styles.actionsContainer}>
                <View style={styles.leftPillGroup}>
                    <TouchableOpacity
                        style={styles.actionPill}
                        activeOpacity={0.7}
                        onPress={handleLike}
                    >
                        <Octicons
                            name={isLiked ? 'heart-fill' : 'heart'}
                            size={18}
                            color={isLiked ? '#50C1FF' : '#0F172A'}
                        />
                        <Text style={styles.actionCount}>{likeNum}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionPill}
                        activeOpacity={0.7}
                        onPress={onCommentPress}
                    >
                        <Octicons name="comment" size={18} color="#0F172A" />
                        <Text style={styles.actionCount}>{commentCount}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.rightActions}>
                    <TouchableOpacity
                        style={styles.circleBtn}
                        activeOpacity={0.7}
                        onPress={onSharePress}
                    >
                        <Octicons name="paper-airplane" size={18} color="#0F172A" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.circleBtn}
                        activeOpacity={0.7}
                        onPress={handleBookmark}
                    >
                        <Octicons
                            name={isBookmarked ? 'bookmark-filled' : 'bookmark'}
                            size={18}
                            color={isBookmarked ? '#50C1FF' : '#0F172A'}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Caption Section */}
            {Boolean(caption) && (
                <View style={styles.captionContainer}>
                    <Text style={styles.captionText}>
                        <Text style={styles.captionUsername}>@{username} </Text>
                        {caption}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24, // Lề hai bên 24px
        paddingVertical: 10,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#E2E8F0',
    },
    avatarPlaceholder: {
        backgroundColor: '#CBD5E1',
    },
    username: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    followButton: {
        paddingHorizontal: 18,
        paddingVertical: 7,
        borderRadius: 9999,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#CBD5E1',
    },
    followingButton: {
        backgroundColor: '#F8FAFC',
    },
    followText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        color: '#858893',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    followingText: {
        fontFamily: 'GoogleSans-Bold',
        color: '#858893',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    // Media Container tràn sát 2 bên mép màn hình
    mediaContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH,
        position: 'relative',
        backgroundColor: '#E2E8F0',
    },
    postImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH,
    },
    imageCounter: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 9999,
    },
    imageCounterText: {
        fontFamily: 'GoogleSans-Medium',
        color: '#FFFFFF',
        fontSize: 12,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    tagOverlay: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tagPill: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 9999,
    },
    tagText: {
        fontFamily: 'GoogleSans-Bold',
        color: '#FFFFFF',
        fontSize: 12,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24, // Lề hai bên 24px
        paddingVertical: 10,
    },
    leftPillGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    actionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 9999,
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 6,
        borderWidth: 1,
        borderColor: '#CBD5E1',
    },
    actionCount: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    circleBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captionContainer: {
        paddingHorizontal: 24, // Lề hai bên 24px
        paddingBottom: 8,
    },
    captionText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 14,
        color: '#334155',
        lineHeight: 20,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    captionUsername: {
        fontFamily: 'GoogleSans-Bold',
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
});