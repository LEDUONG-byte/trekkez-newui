import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Image,
    ImageSourcePropType,
} from 'react-native';
import { Octicons } from '@expo/vector-icons';

export interface TeamPostCardProps {
    id?: string;
    avatar?: ImageSourcePropType | string;
    username?: string;
    isFollowing?: boolean;
    onFollowPress?: () => void;

    teamName?: string;
    memberCount?: number;
    maxMembers?: number;
    teamAvatars?: (ImageSourcePropType | { uri: string })[];
    isJoined?: boolean;
    onToggleJoin?: () => void;
    onPressTeamCard?: () => void;

    caption?: string;
}

export default function TeamPostCard({
                                         avatar = require('../assets/images/logoW.png'),
                                         username = 'user',
                                         isFollowing: initialIsFollowing = false,
                                         onFollowPress,

                                         teamName = 'Sixseven Team',
                                         memberCount = 1,
                                         maxMembers = 10,
                                         teamAvatars = [],
                                         isJoined: initialIsJoined = false,
                                         onToggleJoin,
                                         onPressTeamCard,

                                         caption = '',
                                     }: TeamPostCardProps) {
    const [following, setFollowing] = useState(initialIsFollowing);
    const [joined, setJoined] = useState(initialIsJoined);
    const [currentMembers, setCurrentMembers] = useState(memberCount);

    const handleFollow = () => {
        setFollowing((prev) => !prev);
        if (onFollowPress) onFollowPress();
    };

    const handleToggleJoin = () => {
        const nextJoinedState = !joined;
        setJoined(nextJoinedState);
        setCurrentMembers((prev) => (nextJoinedState ? prev + 1 : Math.max(0, prev - 1)));
        if (onToggleJoin) onToggleJoin();
    };

    const displayAvatars = teamAvatars.slice(0, 3);

    return (
        <View style={styles.postContainer}>
            {/* Header: Người đăng */}
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <Image
                        source={typeof avatar === 'string' ? { uri: avatar } : avatar}
                        style={styles.userAvatar}
                    />
                    <Text style={styles.username}>@{username}</Text>
                </View>

                <TouchableOpacity
                    style={[styles.followBtn, following && styles.followingBtn]}
                    activeOpacity={0.7}
                    onPress={handleFollow}
                >
                    <Text style={[styles.followBtnText, following && styles.followingBtnText]}>
                        {following ? 'Following' : 'Follow'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Thẻ thông tin nhóm (Thụt lề 24px) */}
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={onPressTeamCard}
                style={[
                    styles.teamCardContainer,
                    joined ? styles.teamCardJoined : styles.teamCardDefault,
                ]}
            >
                <View style={styles.avatarStack}>
                    {displayAvatars.length > 0 ? (
                        displayAvatars.map((src, index) => (
                            <Image
                                key={index}
                                source={typeof src === 'string' ? { uri: src } : src}
                                style={[
                                    styles.stackAvatar,
                                    { zIndex: 3 - index, marginLeft: index === 0 ? 0 : -12 },
                                ]}
                            />
                        ))
                    ) : (
                        <>
                            <Image
                                source={require('../assets/images/logoW.png')}
                                style={[styles.stackAvatar, { zIndex: 3 }]}
                            />
                            <View style={[styles.stackAvatar, styles.placeholderAvatar, { zIndex: 2, marginLeft: -12 }]}>
                                <Text style={styles.placeholderText}>?</Text>
                            </View>
                            <View style={[styles.stackAvatar, styles.placeholderAvatar, { zIndex: 1, marginLeft: -12 }]}>
                                <Text style={styles.placeholderText}>?</Text>
                            </View>
                        </>
                    )}
                </View>

                <Text style={styles.teamName} numberOfLines={1}>
                    {teamName}
                </Text>

                <View style={styles.rightActionRow}>
                    {!joined && (
                        <Text style={styles.memberCountText}>
                            {currentMembers}/{maxMembers}
                        </Text>
                    )}

                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleToggleJoin}
                        style={styles.joinIconBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Octicons
                            name={joined ? 'dash' : 'plus'}
                            size={20}
                            color="#0F172A"
                        />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>

            {/* Caption bài đăng */}
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
    postContainer: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 10,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    userAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#E2E8F0',
    },
    username: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    followBtn: {
        paddingHorizontal: 18,
        paddingVertical: 7,
        borderRadius: 9999,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#CBD5E1',
    },
    followingBtn: {
        backgroundColor: '#F8FAFC',
    },
    followBtnText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        color: '#858893',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    followingBtnText: {
        fontFamily: 'GoogleSans-Bold',
        color: '#858893',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    teamCardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        marginHorizontal: 24, // Lề 24px hai bên
        marginVertical: 4,
    },
    teamCardDefault: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    teamCardJoined: {
        backgroundColor: '#BAE6FD',
        borderWidth: 0,
    },
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    stackAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    placeholderAvatar: {
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
    },
    placeholderText: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 13,
        color: '#94A3B8',
    },
    teamName: {
        flex: 1,
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#0F172A',
        includeFontPadding: false,
    },
    rightActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    memberCountText: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 15,
        color: '#0F172A',
    },
    joinIconBtn: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
    },
    captionContainer: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 4,
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