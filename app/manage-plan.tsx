import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    Modal,
    TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

export interface PlanEquipmentItem {
    id: string;
    name: string;
    category: string;
    isPrepared: boolean;
}

export interface PlanMember {
    id: string;
    name: string;
    role: 'LEADER' | 'MEMBER';
    avatarColor: string;
}

export interface PlanDetailData {
    id: string;
    title: string;
    description: string;
    linkedRouteName: string;
    difficulty: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    members: PlanMember[];
    equipment: PlanEquipmentItem[];
}

const MOCK_PLAN_DETAIL: PlanDetailData = {
    id: 'plan_01',
    title: 'Lịch trình phượt Tà Năng - Phan Dũng',
    description: 'Chuyến trekking 3 ngày 2 đêm cùng bạn bè, khởi hành từ bìa rừng Tà Năng.',
    linkedRouteName: 'Route Tà Năng (45km)',
    difficulty: 'HARD',
    startDate: '15/11/2026',
    endDate: '17/11/2026',
    startTime: '05:30',
    endTime: '18:00',
    members: [
        { id: 'm1', name: 'Lê Văn Dương', role: 'LEADER', avatarColor: '#BAE6FD' },
        { id: 'm2', name: 'Nguyễn Huy Hoàng', role: 'MEMBER', avatarColor: '#FEF08A' },
        { id: 'm3', name: 'Võ Đặng Hồng Uyên', role: 'MEMBER', avatarColor: '#A7F3D0' },
    ],
    equipment: [
        { id: 'eq1', name: 'Lều cắm trại 4 người', category: 'SHELTER', isPrepared: true },
        { id: 'eq2', name: 'Túi ngủ ấm (5-10°C)', category: 'SLEEPING', isPrepared: true },
        { id: 'eq3', name: 'Đèn pin đội đầu', category: 'LIGHTING', isPrepared: false },
        { id: 'eq4', name: 'Bộ sơ cứu y tế', category: 'SAFETY', isPrepared: false },
        { id: 'eq5', name: 'Gậy trekking', category: 'GEAR', isPrepared: true },
    ],
};

export default function ManagePlanScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string }>();

    const [plan, setPlan] = useState<PlanDetailData>(MOCK_PLAN_DETAIL);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [newEquipName, setNewEquipName] = useState('');
    const [isAddEquipModalOpen, setIsAddEquipModalOpen] = useState(false);

    // Form edit states
    const [editTitle, setEditTitle] = useState(plan.title);
    const [editDesc, setEditDesc] = useState(plan.description);

    const toggleEquipStatus = (itemId: string) => {
        setPlan((prev) => ({
            ...prev,
            equipment: prev.equipment.map((item) =>
                item.id === itemId ? { ...item, isPrepared: !item.isPrepared } : item
            ),
        }));
    };

    const handleAddEquipment = () => {
        if (!newEquipName.trim()) return;
        const newItem: PlanEquipmentItem = {
            id: `eq_${Date.now()}`,
            name: newEquipName.trim(),
            category: 'CUSTOM',
            isPrepared: false,
        };
        setPlan((prev) => ({
            ...prev,
            equipment: [...prev.equipment, newItem],
        }));
        setNewEquipName('');
        setIsAddEquipModalOpen(false);
    };

    const handleSaveGeneralInfo = () => {
        setPlan((prev) => ({
            ...prev,
            title: editTitle,
            description: editDesc,
        }));
        setIsEditModalOpen(false);
    };

    const handleDeletePlan = () => {
        Alert.alert('Delete Plan', 'Are you sure you want to delete this plan?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => router.back(),
            },
        ]);
    };

    const preparedCount = plan.equipment.filter((e) => e.isPrepared).length;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* --- HEADER CONTAINER ĐỒNG BỘ CHUẨN (KHÔNG NÉT ĐỨT) --- */}
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

                    <Text style={styles.headerTitle}>MANAGE PLAN</Text>

                    <TouchableOpacity
                        style={styles.deleteHeaderBtn}
                        activeOpacity={0.7}
                        onPress={handleDeletePlan}
                    >
                        <Octicons name="trash" size={18} color="#DC2626" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* --- CARD THÔNG TIN TỔNG QUAN --- */}
                <View style={styles.sectionCard}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.planTitleText}>{plan.title}</Text>
                        <TouchableOpacity
                            style={styles.editIconBtn}
                            activeOpacity={0.7}
                            onPress={() => setIsEditModalOpen(true)}
                        >
                            <Octicons name="pencil" size={16} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.planDescText}>{plan.description}</Text>

                    <View style={styles.tagMetaRow}>
                        <View style={styles.metaBadge}>
                            <Octicons name="git-branch" size={13} color="#0284C7" />
                            <Text style={styles.metaBadgeText}>{plan.linkedRouteName}</Text>
                        </View>
                        <View style={[styles.metaBadge, styles.difficultyBadge]}>
                            <Text style={styles.difficultyText}>{plan.difficulty}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.timeInfoGrid}>
                        <View style={styles.timeItemCol}>
                            <Text style={styles.timeLabel}>DEPARTURE</Text>
                            <Text style={styles.timeValue}>{plan.startTime} • {plan.startDate}</Text>
                        </View>
                        <View style={styles.timeItemCol}>
                            <Text style={styles.timeLabel}>ARRIVAL</Text>
                            <Text style={styles.timeValue}>{plan.endTime} • {plan.endDate}</Text>
                        </View>
                    </View>
                </View>

                {/* --- CHECKLIST ĐỒ ĐẠC / TRANG THIẾT BỊ --- */}
                <View style={styles.sectionCard}>
                    <View style={styles.cardHeaderRow}>
                        <View>
                            <Text style={styles.sectionTitle}>EQUIPMENT CHECKLIST</Text>
                            <Text style={styles.sectionSubtitle}>
                                Prepared {preparedCount}/{plan.equipment.length} items
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.addMiniBtn}
                            activeOpacity={0.8}
                            onPress={() => setIsAddEquipModalOpen(true)}
                        >
                            <Octicons name="plus" size={14} color="#0F172A" />
                            <Text style={styles.addMiniBtnText}>Add</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.equipListWrapper}>
                        {plan.equipment.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[
                                    styles.equipItemRow,
                                    item.isPrepared && styles.equipItemRowPrepared,
                                ]}
                                activeOpacity={0.7}
                                onPress={() => toggleEquipStatus(item.id)}
                            >
                                <View style={[styles.checkboxSquare, item.isPrepared && styles.checkboxSquareActive]}>
                                    {item.isPrepared && <Octicons name="check" size={14} color="#FFFFFF" />}
                                </View>
                                <Text
                                    style={[
                                        styles.equipItemName,
                                        item.isPrepared && styles.equipItemNameDone,
                                    ]}
                                >
                                    {item.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* --- QUẢN LÝ THÀNH VIÊN TRONG PLAN --- */}
                <View style={styles.sectionCard}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.sectionTitle}>MEMBERS ({plan.members.length})</Text>
                        <TouchableOpacity
                            style={styles.addMiniBtn}
                            activeOpacity={0.8}
                            onPress={() => router.push('/teaming')}
                        >
                            <Octicons name="person-add" size={13} color="#0F172A" />
                            <Text style={styles.addMiniBtnText}>Invite</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.memberListCol}>
                        {plan.members.map((m) => (
                            <View key={m.id} style={styles.memberRowItem}>
                                <View style={[styles.memberAvatarCircle, { backgroundColor: m.avatarColor }]}>
                                    <Text style={styles.memberAvatarInitial}>{m.name.charAt(0)}</Text>
                                </View>
                                <View style={styles.memberInfo}>
                                    <Text style={styles.memberName}>{m.name}</Text>
                                    <Text style={styles.memberRoleText}>{m.role}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* --- MODAL CHỈNH SỬA THÔNG TIN PLAN --- */}
            <Modal visible={isEditModalOpen} transparent animationType="slide" onRequestClose={() => setIsEditModalOpen(false)}>
                <View style={styles.modalBackdrop}>
                    <TouchableWithoutFeedback onPress={() => setIsEditModalOpen(false)}>
                        <View style={styles.modalDismissArea} />
                    </TouchableWithoutFeedback>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Edit Plan Information</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.fieldLabel}>Plan Name</Text>
                            <TextInput
                                style={styles.textInputBox}
                                value={editTitle}
                                onChangeText={setEditTitle}
                                placeholder="Enter plan name..."
                                placeholderTextColor="#94A3B8"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.fieldLabel}>Description</Text>
                            <TextInput
                                style={[styles.textInputBox, styles.textAreaBox]}
                                value={editDesc}
                                onChangeText={setEditDesc}
                                placeholder="Enter description..."
                                placeholderTextColor="#94A3B8"
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <TouchableOpacity style={styles.confirmBtn} activeOpacity={0.85} onPress={handleSaveGeneralInfo}>
                            <Text style={styles.confirmBtnText}>Save Changes</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* --- MODAL THÊM ĐỒ DÙNG --- */}
            <Modal visible={isAddEquipModalOpen} transparent animationType="fade" onRequestClose={() => setIsAddEquipModalOpen(false)}>
                <View style={styles.modalBackdrop}>
                    <TouchableWithoutFeedback onPress={() => setIsAddEquipModalOpen(false)}>
                        <View style={styles.modalDismissArea} />
                    </TouchableWithoutFeedback>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Add Checklist Item</Text>
                        <TextInput
                            style={styles.textInputBox}
                            value={newEquipName}
                            onChangeText={setNewEquipName}
                            placeholder="e.g. Rain poncho, Water filter..."
                            placeholderTextColor="#94A3B8"
                            autoFocus
                        />
                        <TouchableOpacity style={styles.confirmBtn} activeOpacity={0.85} onPress={handleAddEquipment}>
                            <Text style={styles.confirmBtnText}>Add Item</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        paddingTop: 12,
        marginBottom: 16,
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
    deleteHeaderBtn: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 40,
        gap: 16,
    },
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 18,
        gap: 12,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    planTitleText: {
        flex: 1,
        fontFamily: 'GoogleSans-Bold',
        fontSize: 18,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
        paddingRight: 8,
    },
    editIconBtn: {
        padding: 4,
    },
    planDescText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 14,
        color: '#475569',
        lineHeight: 20,
        includeFontPadding: false,
    },
    tagMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        gap: 6,
    },
    metaBadgeText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 12,
        color: '#0284C7',
        includeFontPadding: false,
    },
    difficultyBadge: {
        backgroundColor: '#FEF3C7',
    },
    difficultyText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 12,
        color: '#B45309',
        includeFontPadding: false,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 4,
    },
    timeInfoGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    timeItemCol: {
        gap: 4,
    },
    timeLabel: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 11,
        color: '#94A3B8',
        includeFontPadding: false,
    },
    timeValue: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        color: '#0F172A',
        includeFontPadding: false,
    },
    sectionTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    sectionSubtitle: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
        includeFontPadding: false,
    },
    addMiniBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        gap: 6,
    },
    addMiniBtnText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 12,
        color: '#0F172A',
        includeFontPadding: false,
    },
    equipListWrapper: {
        gap: 8,
        marginTop: 4,
    },
    equipItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 12,
    },
    equipItemRowPrepared: {
        backgroundColor: '#F0FDF4',
    },
    checkboxSquare: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSquareActive: {
        backgroundColor: '#16A34A',
        borderColor: '#16A34A',
    },
    equipItemName: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 14,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    equipItemNameDone: {
        color: '#94A3B8',
        textDecorationLine: 'line-through',
    },
    memberListCol: {
        gap: 10,
        marginTop: 4,
    },
    memberRowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    memberAvatarCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    memberAvatarInitial: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#0F172A',
        includeFontPadding: false,
    },
    memberInfo: {
        flex: 1,
        gap: 2,
    },
    memberName: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#0F172A',
        includeFontPadding: false,
    },
    memberRoleText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 12,
        color: '#64748B',
        includeFontPadding: false,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'flex-end',
    },
    modalDismissArea: {
        flex: 1,
    },
    modalSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 32,
        gap: 14,
    },
    modalTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 18,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    inputGroup: {
        gap: 6,
    },
    fieldLabel: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        color: '#475569',
        includeFontPadding: false,
    },
    textInputBox: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 48,
        fontFamily: 'GoogleSans-Regular',
        fontSize: 14,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    textAreaBox: {
        height: 80,
        textAlignVertical: 'top',
        paddingTop: 10,
    },
    confirmBtn: {
        backgroundColor: '#1E293B',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 6,
    },
    confirmBtnText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
});