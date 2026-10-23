import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    LayoutAnimation,
} from 'react-native';
import { Octicons } from '@expo/vector-icons';

export interface ExpandableCardProps {
    id: string;
    title: string;
    iconName?: keyof typeof Octicons.glyphMap; // Cho phép truyền tên Icon linh hoạt từ DB
    isOwnedByYou?: boolean;
    headerColor?: string;
    children?: React.ReactNode;
    defaultExpanded?: boolean;
    onHeaderPress?: (id: string) => void; // Event Handler khi bấm vào thanh Header
}

export default function ExpandableCard({
                                           id,
                                           title,
                                           iconName = 'question', // Mặc định nếu DB chưa trả về icon
                                           isOwnedByYou = true,
                                           headerColor,
                                           children,
                                           defaultExpanded = false,
                                           onHeaderPress,
                                       }: ExpandableCardProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);
    };

    // Mặc định màu theo loại sở hữu nếu không truyền headerColor
    const bgHeaderColor = headerColor || (isOwnedByYou ? '#BAE6FD' : '#FEF08A');

    return (
        <View style={styles.cardContainer}>
            {/* Header Ngăn kéo - Bấm vào vùng thanh để gọi Action / Navigate */}
            <TouchableOpacity
                style={[
                    styles.header,
                    { backgroundColor: bgHeaderColor },
                    isExpanded ? styles.headerExpanded : styles.headerCollapsed,
                ]}
                activeOpacity={0.85}
                onPress={() => onHeaderPress?.(id)}
            >
                <View style={styles.headerLeft}>
                    <View style={styles.circleIcon}>
                        <Octicons name={iconName} size={16} color="#64748B" />
                    </View>
                    <Text style={styles.headerTitle}>{title}</Text>
                </View>

                {/* Tách riêng nút Icon Dấu cộng/trừ để chỉ xử lý đóng/mở Ngăn kéo */}
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
    },
    circleIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#0F172A',
        includeFontPadding: false,
    },
    toggleBtn: {
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bodyDashedContainer: {
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        borderTopWidth: 0,
        borderBottomLeftRadius: 14,
        borderBottomRightRadius: 14,
        backgroundColor: '#FAFDF8',
        padding: 16,
        minHeight: 120,
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