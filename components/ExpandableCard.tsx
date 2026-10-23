import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    LayoutAnimation,
    Image,
} from 'react-native';
import { Octicons } from '@expo/vector-icons';

export interface ExpandableCardProps {
    id: string;
    title: string;
    imageUrl?: string;
    iconName?: keyof typeof Octicons.glyphMap; // Tên Icon linh hoạt từ DB hoặc props
    isOwnedByYou?: boolean;
    headerColor?: string;
    children?: React.ReactNode;
    defaultExpanded?: boolean;
    onHeaderPress?: (id: string) => void; // Handler khi nhấn vào Header
    onTitlePress?: (id?: string) => void;  // Alias handler tương thích với PlanScreen
}

export default function ExpandableCard({
                                           id,
                                           title,
                                           imageUrl,
                                           iconName = 'bookmark',
                                           isOwnedByYou = true,
                                           headerColor = '#FFFFFF',
                                           children,
                                           defaultExpanded = false,
                                           onHeaderPress,
                                           onTitlePress,
                                       }: ExpandableCardProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);
    };

    const handleHeaderPress = () => {
        if (onTitlePress) {
            onTitlePress(id);
        } else if (onHeaderPress) {
            onHeaderPress(id);
        }
    };

    return (
        <View style={styles.cardContainer}>
            {/* Header Ngăn kéo - Bấm vào thanh để chuyển trang Manage */}
            <TouchableOpacity
                style={[
                    styles.header,
                    { backgroundColor: headerColor },
                    isExpanded ? styles.headerExpanded : styles.headerCollapsed,
                ]}
                activeOpacity={0.85}
                onPress={handleHeaderPress}
            >
                <View style={styles.headerLeft}>
                    <View style={styles.circleIcon}>
                        {imageUrl ? (
                            <Image source={{ uri: imageUrl }} style={styles.headerImage} />
                        ) : (
                            <Octicons name={iconName} size={16} color="#0F172A" />
                        )}
                    </View>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {title}
                    </Text>
                </View>

                {/* Nút Dấu cộng/trừ để đóng/mở nội dung ngăn kéo */}
                <TouchableOpacity
                    style={styles.toggleBtn}
                    activeOpacity={0.6}
                    onPress={toggleExpand}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Octicons
                        name={isExpanded ? 'dash' : 'plus'}
                        size={20}
                        color="#0F172A"
                    />
                </TouchableOpacity>
            </TouchableOpacity>

            {/* Nội dung ngăn kéo (Khung nét đứt) */}
            {isExpanded && (
                <View style={styles.bodyDashedContainer}>
                    {children ? (
                        children
                    ) : (
                        <View style={styles.placeholderContent}>
                            <Text style={styles.placeholderText}>
                                Chưa có thông tin chi tiết.
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        marginBottom: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 14,
        zIndex: 2,
    },
    headerCollapsed: {
        borderRadius: 14,
    },
    headerExpanded: {
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        paddingRight: 8,
    },
    circleIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerImage: {
        width: '100%',
        height: '100%',
    },
    headerTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#0F172A',
        includeFontPadding: false,
        flex: 1,
    },
    toggleBtn: {
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bodyDashedContainer: {
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        borderRadius: 14,
        marginTop: -14,
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 26,
        minHeight: 100,
        zIndex: 1,
    },
    placeholderContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    placeholderText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 13,
        color: '#94A3B8',
    },
});