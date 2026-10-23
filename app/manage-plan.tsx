import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Component ExpandableCard có sẵn
import ExpandableCard from '../components/ExpandableCard';

// =====================================================================
// 1. DATA CONTRACTS (TYPES & INTERFACES)
// =====================================================================
export type PlanDifficulty = 'EASY' | 'MODERATE' | 'HARD' | 'EXTREME';

export interface PlanMember {
    id: string;
    name: string;
    avatarUrl?: string;
}

export interface PlanRouteSummary {
    id: string;
    name: string;
    totalDistanceKm?: number;
    estimatedDurationMinutes?: number;
    startPointName?: string;
    endPointName?: string;
    notes?: string;
}

export interface PlanDetailData {
    id: string;
    name: string;
    difficulty: PlanDifficulty;
    description: string;
    departureTime: string; // ISO 8601 hoặc định dạng hiển thị: "05:30 15/11/2026"
    arrivalTime: string;   // "18:00 17/11/2026"
    route: PlanRouteSummary;
    team: {
        id: string;
        name: string;
        members: PlanMember[];
    };
    noteContent?: string;  // Nội dung ghi chú hành trình
}

// Bảng màu cho từng cấp độ
const DIFFICULTY_CONFIG: Record<PlanDifficulty, { bg: string; text: string }> = {
    EASY: { bg: '#EBF4FF', text: '#2563EB' },
    MODERATE: { bg: '#FEF3C7', text: '#D97706' },
    HARD: { bg: '#FEE2E2', text: '#DC2626' },
    EXTREME: { bg: '#EDE9FE', text: '#7C3AED' },
};

// =====================================================================
// 2. MOCK / FALLBACK DATA
// =====================================================================
const DEFAULT_PLAN_DATA: PlanDetailData = {
    id: 'plan_001',
    name: 'Trekking Tà Năng - Phan Dũng',
    difficulty: 'EASY',
    description: 'Chuyến đi khám phá cung đường trekking đẹp nhất miền Nam qua đồi thông và thảo nguyên bao la.',
    departureTime: '05:30 15/11/2026',
    arrivalTime: '18:00 17/11/2026',
    route: {
        id: 'route_001',
        name: 'route A',
        totalDistanceKm: 32.5,
        estimatedDurationMinutes: 1200,
        startPointName: 'Xã Tà Năng, Đức Trọng, Lâm Đồng',
        endPointName: 'Xã Phan Dũng, Tuy Phong, Bình Thuận',
        notes: 'Chuẩn bị nước tối thiểu 3L/ngày, giày leo núi có độ bám cao và đèn pin chuyên dụng.',
    },
    team: {
        id: 'team_001',
        name: 'Sixseven Team',
        members: [
            {
                id: 'mem_1',
                name: 'Nguyễn Văn A',
                avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
            },
            {
                id: 'mem_2',
                name: 'Trần Thị B',
                avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
            },
            {
                id: 'mem_3',
                name: 'Lê Văn C',
            },
            {
                id: 'mem_4',
                name: 'Phạm Thị D',
            },
        ],
    },
    noteContent: 'Mang theo áo mưa, đồ sơ cứu y tế và kiểm tra bình acquy trước khi xuất phát qua đèo.',
};

// =====================================================================
// 3. MAIN COMPONENT
// =====================================================================
export default function ManagePlanScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id: planId } = useLocalSearchParams<{ id?: string }>();

    const [planData, setPlanData] = useState<PlanDetailData>(DEFAULT_PLAN_DATA);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        if (!planId) return;

        const loadPlanDetail = async () => {
            setIsLoading(true);
            try {
                console.log(`Loading plan data for ID: ${planId}`);
            } catch (error) {
                console.error('Failed to load plan detail:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadPlanDetail();
    }, [planId]);

    const handleEdit = () => {
        router.push({
            pathname: '/makeaplan' as any,
            params: { editPlanId: planData.id },
        });
    };

    const currentDifficulty = DIFFICULTY_CONFIG[planData.difficulty] || DIFFICULTY_CONFIG.EASY;

    if (isLoading) {
        return (
            <View style={[styles.container, styles.loadingCenter]}>
                <ActivityIndicator size="large" color="#207BFB" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* 1. Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <Octicons name="chevron-left" size={24} color="#64748B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>MANAGE PLAN</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            {/* 2. Scrollable Cards Content */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 85 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Card 1: Level Badge & Tên Plan */}
                <View style={styles.cardLevelName}>
                    <View style={[styles.badgeLevel, { backgroundColor: currentDifficulty.bg }]}>
                        <Text style={[styles.badgeLevelText, { color: currentDifficulty.text }]}>
                            {planData.difficulty}
                        </Text>
                    </View>
                    <Text style={styles.planNameText} numberOfLines={1}>
                        {planData.name}
                    </Text>
                </View>

                {/* Card 2: Mô tả & Thời gian Khởi hành - Đến nơi */}
                <View style={styles.cardDesc}>
                    <Text style={styles.descText}>
                        {planData.description || '<descriptive paragraph>'}
                    </Text>

                    <View style={styles.timeRow}>
                        <View style={styles.timeCol}>
                            <Text style={styles.timeLabel}>DEPARTURE</Text>
                            <Text style={styles.timeValue}>{planData.departureTime}</Text>
                        </View>
                        <View style={[styles.timeCol, { alignItems: 'flex-end' }]}>
                            <Text style={styles.timeLabel}>ARRIVAL</Text>
                            <Text style={styles.timeValue}>{planData.arrivalTime}</Text>
                        </View>
                    </View>
                </View>

                {/* Card 3: ExpandableCard cho Route Summary */}
                <ExpandableCard
                    id={`route_${planData.route.id}`}
                    title={planData.route.name}
                    iconName="milestone"
                    headerColor="#207BFB"
                    defaultExpanded={true}
                    onHeaderPress={() => {
                        router.push({
                            pathname: '/manage-route' as any,
                            params: { id: planData.route.id },
                        });
                    }}
                >
                    <View style={styles.routeDetailBox}>
                        {planData.route.totalDistanceKm && (
                            <View style={styles.routeMetaRow}>
                                <Text style={styles.routeMetaLabel}>Khoảng cách:</Text>
                                <Text style={styles.routeMetaValue}>{planData.route.totalDistanceKm} km</Text>
                            </View>
                        )}
                        {planData.route.startPointName && (
                            <View style={styles.routeMetaRow}>
                                <Text style={styles.routeMetaLabel}>Xuất phát:</Text>
                                <Text style={styles.routeMetaValue}>{planData.route.startPointName}</Text>
                            </View>
                        )}
                        {planData.route.endPointName && (
                            <View style={styles.routeMetaRow}>
                                <Text style={styles.routeMetaLabel}>Đích đến:</Text>
                                <Text style={styles.routeMetaValue}>{planData.route.endPointName}</Text>
                            </View>
                        )}
                    </View>
                </ExpandableCard>

                {/* Card 4: Nhóm tham gia (Team Box) */}
                <TouchableOpacity
                    style={styles.teamCard}
                    activeOpacity={0.9}
                    onPress={() => {
                        router.push({
                            pathname: '/manage-team' as any,
                            params: { id: planData.team.id },
                        });
                    }}
                >
                    <View style={styles.teamAvatars}>
                        {planData.team.members.slice(0, 3).map((member, index) => {
                            const offsetStyle = { marginLeft: index === 0 ? 0 : -12, zIndex: 3 - index };

                            if (member.avatarUrl) {
                                return (
                                    <Image
                                        key={member.id}
                                        source={{ uri: member.avatarUrl }}
                                        style={[styles.teamAvatarImg, offsetStyle]}
                                    />
                                );
                            }
                            return (
                                <View key={member.id} style={[styles.teamAvatarPlaceholder, offsetStyle]}>
                                    <Text style={styles.avatarQuestion}>
                                        {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                    </Text>
                                </View>
                            );
                        })}

                        {planData.team.members.length > 3 && (
                            <View style={[styles.teamAvatarMore, { marginLeft: -12, zIndex: 0 }]}>
                                <Text style={styles.teamAvatarMoreText}>
                                    +{planData.team.members.length - 3}
                                </Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.teamNameText} numberOfLines={1}>
                        {planData.team.name}
                    </Text>
                </TouchableOpacity>

                {/* Card 5: Khung Note (Ghi chú chi tiết) */}
                <TouchableOpacity
                    style={styles.noteCard}
                    activeOpacity={0.9}
                    onPress={() => {
                        router.push({
                            pathname: '/note-detail' as any,
                            params: { planId: planData.id },
                        });
                    }}
                >
                    <Text style={styles.noteCardTitleText}>note</Text>
                    <Text style={styles.noteCardContentText} numberOfLines={4}>
                        {planData.noteContent || 'Chưa có ghi chú nào được thêm vào...'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {/* 3. Nút Edit cố định chân trang */}
            <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <TouchableOpacity
                    style={styles.editBtn}
                    activeOpacity={0.85}
                    onPress={handleEdit}
                >
                    <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// =====================================================================
// 4. STYLES
// =====================================================================
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F1F5F9',
    },
    loadingCenter: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    backBtn: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 18,
        color: '#0F172A',
        letterSpacing: 0.5,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    headerPlaceholder: {
        width: 36,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 16,
        paddingTop: 8,
    },
    // Card 1: Level + Name
    cardLevelName: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    badgeLevel: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeLevelText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    planNameText: {
        flex: 1,
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#334155',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    // Card 2: Desc + Departure/Arrival
    cardDesc: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        gap: 32,
    },
    descText: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 14,
        color: '#334155',
        lineHeight: 20,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    timeCol: {
        gap: 6,
    },
    timeLabel: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 11,
        color: '#64748B',
        letterSpacing: 0.5,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    timeValue: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    // Card 3: Route Details Box
    routeDetailBox: {
        gap: 8,
    },
    routeMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    routeMetaLabel: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        color: '#64748B',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    routeMetaValue: {
        flex: 1,
        fontFamily: 'GoogleSans-Medium',
        fontSize: 13,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    // Card 4: Team Box
    teamCard: {
        backgroundColor: '#207BFB',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 14,
    },
    teamAvatars: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    teamAvatarImg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    teamAvatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#207BFB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    teamAvatarMore: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#0F172A',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    teamAvatarMoreText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 11,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    avatarQuestion: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#64748B',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    teamNameText: {
        flex: 1,
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    // Card 5: Note Card Box
    noteCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        paddingHorizontal: 16,
        paddingVertical: 16,
        minHeight: 140,
        gap: 8,
    },
    noteCardTitleText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#64748B',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    noteCardContentText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 14,
        color: '#334155',
        lineHeight: 20,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    // Footer CTA
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        backgroundColor: 'transparent',
    },
    editBtn: {
        backgroundColor: '#1E232B',
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editBtnText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
});