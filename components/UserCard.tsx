import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Image,
    Animated,
    Easing,
} from 'react-native';

export interface UserCardData {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string;
    isInvited?: boolean;
}

export interface UserCardProps {
    user: UserCardData;
    isInvited?: boolean;
    onPress?: (user: UserCardData) => void;
    onInvitePress?: (user: UserCardData) => void;
    renderAction?: (user: UserCardData, isInvited: boolean) => React.ReactNode;
    renderAvatar?: (user: UserCardData) => React.ReactNode;
}

// Component phụ tự động chạy chữ khi văn bản vượt quá chiều rộng container
function MarqueeText({ text, style }: { text: string; style?: any }) {
    const [containerWidth, setContainerWidth] = useState(0);
    const [textWidth, setTextWidth] = useState(0);
    const translateX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (textWidth > containerWidth && containerWidth > 0) {
            const overflowDistance = textWidth - containerWidth + 12;
            const duration = (overflowDistance / 25) * 1000; // Tốc độ chạy chữ

            const animation = Animated.loop(
                Animated.sequence([
                    Animated.delay(1200),
                    Animated.timing(translateX, {
                        toValue: -overflowDistance,
                        duration: duration,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                    Animated.delay(1200),
                    Animated.timing(translateX, {
                        toValue: 0,
                        duration: 600,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                ])
            );
            animation.start();
            return () => animation.stop();
        } else {
            translateX.setValue(0);
        }
    }, [textWidth, containerWidth, text]);

    return (
        <View
            style={styles.marqueeContainer}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
            <Animated.View style={{ transform: [{ translateX }], flexDirection: 'row' }}>
                <Text
                    style={[style, { flexShrink: 0 }]}
                    numberOfLines={1}
                    onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
                >
                    {text}
                </Text>
            </Animated.View>
        </View>
    );
}

export default function UserCard({
                                     user,
                                     isInvited = false,
                                     onPress,
                                     onInvitePress,
                                     renderAction,
                                     renderAvatar,
                                 }: UserCardProps) {
    const activeInvited = isInvited || Boolean(user.isInvited);

    const handleCardPress = () => {
        if (onPress) {
            onPress(user);
        } else if (onInvitePress) {
            onInvitePress(user);
        }
    };

    const handleActionPress = () => {
        if (onInvitePress) {
            onInvitePress(user);
        } else if (onPress) {
            onPress(user);
        }
    };

    const formattedUsername = user.username.startsWith('@')
        ? user.username
        : `@${user.username}`;

    return (
        <TouchableOpacity
            style={[styles.container, activeInvited && styles.containerInvited]}
            activeOpacity={0.8}
            onPress={handleCardPress}
        >
            {/* Avatar */}
            {renderAvatar ? (
                renderAvatar(user)
            ) : (
                <View style={styles.avatarWrapper}>
                    {user.avatarUrl ? (
                        <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
                    ) : (
                        <View style={styles.avatarPlaceholder} />
                    )}
                </View>
            )}

            {/* Thông tin User (Chạy chữ tự động khi tên / username quá dài) */}
            <View style={styles.infoCol}>
                <MarqueeText
                    text={user.name}
                    style={[styles.nameText, activeInvited && styles.nameTextInvited]}
                />
                <MarqueeText
                    text={formattedUsername}
                    style={[styles.handleText, activeInvited && styles.handleTextInvited]}
                />
            </View>

            {/* Action Button */}
            {renderAction ? (
                renderAction(user, activeInvited)
            ) : (
                <TouchableOpacity
                    style={styles.actionBtn}
                    activeOpacity={0.7}
                    onPress={handleActionPress}
                >
                    <Text style={[styles.actionText, activeInvited && styles.actionTextInvited]}>
                        {activeInvited ? 'Invited' : 'Invite'}
                    </Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingHorizontal: 16,
        height: 60,
        gap: 10,
    },
    containerInvited: {
        backgroundColor: '#207bfb',
    },
    avatarWrapper: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1E293B',
    },
    avatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    infoCol: {
        flex: 1,
        justifyContent: 'center',
        overflow: 'hidden',
    },
    marqueeContainer: {
        overflow: 'hidden',
        width: '100%',
    },
    nameText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 12,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    nameTextInvited: {
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    handleText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 10,
        color: '#64748B',
        marginTop: 2,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    handleTextInvited: {
        color: '#93C5FD',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    actionBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    actionText: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 14,
        color: '#64748B',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    actionTextInvited: {
        color: '#93C5FD',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
});