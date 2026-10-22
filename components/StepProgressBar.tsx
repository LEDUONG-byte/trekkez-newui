import React, { useState } from 'react';
import { StyleSheet, View, Text, LayoutChangeEvent } from 'react-native';
import { Octicons } from '@expo/vector-icons';

interface StepProgressBarProps {
    currentStepIndex: number;
    totalSteps: number;
    stepName: string;
    iconName?: keyof typeof Octicons.glyphMap;
}

export default function StepProgressBar({
                                            currentStepIndex,
                                            totalSteps,
                                            stepName,
                                            iconName = 'issue-draft',
                                        }: StepProgressBarProps) {
    const [trackWidth, setTrackWidth] = useState<number>(0);
    const [badgeWidth, setBadgeWidth] = useState<number>(0);

    const progressPercentage = Math.min(
        100,
        Math.max(0, ((currentStepIndex + 1) / totalSteps) * 100)
    );

    const handleTrackLayout = (event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;
        if (width > 0 && width !== trackWidth) {
            setTrackWidth(width);
        }
    };

    const handleBadgeLayout = (event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;
        if (width > 0 && width !== badgeWidth) {
            setBadgeWidth(width);
        }
    };

    // Tọa độ đầu thanh xanh theo px
    const progressPos = (progressPercentage / 100) * trackWidth;

    // Giới hạn lề trái/phải để Badge không bị tràn khỏi viền màn hình (cho phép nhô ra lề tối đa 12px)
    const minBadgeLeft = -12;
    const maxBadgeLeft = trackWidth > 0 ? trackWidth + 12 - badgeWidth : 0;

    const idealBadgeLeft = progressPos - badgeWidth / 2;
    const actualBadgeLeft =
        trackWidth > 0
            ? Math.max(minBadgeLeft, Math.min(idealBadgeLeft, maxBadgeLeft))
            : 0;

    return (
        <View style={styles.progressContainer}>
            <View style={styles.trackWrapper} onLayout={handleTrackLayout}>
                {/* Thanh tiến trình nền xám & xanh */}
                <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
                </View>

                {/* Mũi tên tam giác - Luôn gắn cố định đỉnh vào vị trí tiến trình % */}
                <View
                    style={[
                        styles.triangleUp,
                        {
                            left: `${progressPercentage}%`,
                        },
                    ]}
                />

                {/* Badge tên bước - Tự động giới hạn lề (Clamp) để không tràn màn hình */}
                <View
                    style={[
                        styles.stepBadge,
                        {
                            left: actualBadgeLeft,
                            opacity: trackWidth > 0 && badgeWidth > 0 ? 1 : 0,
                        },
                    ]}
                    onLayout={handleBadgeLayout}
                >
                    <Octicons name={iconName} size={12} color="#3B82F6" />
                    <Text style={styles.stepBadgeText}>
                        {stepName.replace('_', ' ').toLowerCase()}
                    </Text>
                </View>
            </View>

            {/* Thanh nét đứt bên dưới */}
            <View style={styles.progressDashedLine} />
        </View>
    );
}

const styles = StyleSheet.create({
    progressContainer: {
        marginBottom: 24,
    },
    trackWrapper: {
        marginHorizontal: 24,
        position: 'relative',
    },
    progressBarBackground: {
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        overflow: 'hidden',
        width: '100%',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 3,
    },
    triangleUp: {
        position: 'absolute',
        top: 8,
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderBottomWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#FFFFFF',
        transform: [{ translateX: -6 }], // Căn chính tâm đỉnh tam giác vào điểm % tiến trình
        zIndex: 11,
    },
    stepBadge: {
        position: 'absolute',
        top: 13, // Khung chữ dính liền mép dưới tam giác
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
        zIndex: 10,
    },
    stepBadgeText: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 11,
        color: '#64748B',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    progressDashedLine: {
        marginTop: 48,
        marginHorizontal: 24,
        borderBottomWidth: 1,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
    },
});