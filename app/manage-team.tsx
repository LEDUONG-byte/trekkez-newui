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

export interface TeamMemberItem {
    id: string;
    name: string;
    username: string;
    role: 'LEADER' | 'MEMBER';
    avatarColor: string;
}

export interface JoinRequestItem {
    id: string;
    name: string;
    username: string;
    requestedAt: string;
}

export interface TeamManageData {
    id: string;
    name: string;
    description: string;
    isPublic: boolean;
    maxMembers: number;
    members: TeamMemberItem[];
    pendingRequests: JoinRequestItem[];
}

const MOCK_TEAM_MANAGE: TeamManageData = {
    id: 'team_01',
    name: 'Sixseven Trekking Team',
    description: 'Nhóm chuyên leo núi, trekking cung Tây Bắc và cắm trại cuối tuần.',
    isPublic: false,
    maxMembers: 8,
    members: [
        { id: 'u_me', name: 'Lê Văn Dương', username: 'leduong', role: 'LEADER', avatarColor: '#BAE6FD' },
        { id: 'u2', name: 'Nguyễn Huy Hoàng', username: 'huyhoang', role: 'MEMBER', avatarColor: '#FEF08A' },
        { id: 'u3', name: 'Võ Đặng Hồng Uyên', username: 'honguyen', role: 'MEMBER', avatarColor: '#A7F3D0' },
        { id: 'u4', name: 'Trần Văn Nam', username: 'namtv', role: 'MEMBER', avatarColor: '#DDD6FE' },
    ],
    pendingRequests: [
        { id: 'req_1', name: 'Hoàng Minh Tuấn', username: 'tuanhm', requestedAt: 'Hôm nay 10:20' },
        { id: 'req_2', name: 'Nguyễn Bích Ngọc', username: 'ngocbich', requestedAt: 'Hôm qua 16:45' },
    ],
};

export default function ManageTeamScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string }>();

    const [team, setTeam] = useState<TeamManageData>(MOCK_TEAM_MANAGE);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editName, setEditName] = useState(team.name);
    const [editDesc, setEditDesc] = useState(team.description);

    const handleAcceptRequest = (reqId: string) => {
        const req = team.pendingRequests.find((r) => r.id === reqId);
        if (!req) return;

        const newMember: TeamMemberItem = {
            id: req.id,
            name: req.name,
            username: req.username,
            role: 'MEMBER',
            avatarColor: '#BAE6FD',
        };

        setTeam((prev) => ({
            ...prev,
            members: [...prev.members, newMember],
            pendingRequests: prev.pendingRequests.filter((r) => r.id !== reqId),
        }));
    };

    const handleRejectRequest = (reqId: string) => {
        setTeam((prev) => ({
            ...prev,
            pendingRequests: prev.pendingRequests.filter((r) => r.id !== reqId),
        }));
    };

    const handleKickMember = (memberId: string) => {
        Alert.alert('Xoá thành viên', 'Bạn có chắc chắn muốn mời thành viên này rời nhóm?', [
            { text: 'Huỷ', style: 'cancel' },
            {
                text: 'Xoá',
                style: 'destructive',
                onPress: () => {
                    setTeam((prev) => ({
                        ...prev,
                        members: prev.members.filter((m) => m.id !== memberId),
                    }));
                },
            },
        ]);
    };

    const handleSaveTeamInfo = () => {
        setTeam((prev) => ({
            ...prev,
            name: editName,
            description: editDesc,
        }));
        setIsEditModalOpen(false);
    };

    const handleDisbandTeam = () => {
        Alert.alert('Giải tán nhóm', 'Thao tác này không thể hoàn tác. Bạn có chắc chắn không?', [
            { text: 'Huỷ', style: 'cancel' },
            { text: 'Giải tán', style: 'destructive', onPress: () => router.back() },
        ]);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.headerBar}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Octicons name="chevron-left" size={24} color="#0F172A" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>MANAGE TEAM</Text>

                <TouchableOpacity
                    style={styles.deleteHeaderBtn}
                    activeOpacity={0.7}
                    onPress={handleDisbandTeam}
                >
                    <Octicons name="trash" size={18} color="#DC2626" />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* --- THÔNG TIN NHÓM --- */}
                <View style={styles.sectionCard}>
                    <View style={styles.cardHeaderRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.teamTitle}>{team.name}</Text>
                            <Text style={styles.teamMeta}>
                                {team.members.length}/{team.maxMembers} thành viên • {team.isPublic ? 'Public' : 'Cần xét duyệt'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.editIconBtn}
                            activeOpacity={0.7}
                            onPress={() => setIsEditModalOpen(true)}
                        >
                            <Octicons name="pencil" size={16} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.teamDesc}>{team.description}</Text>
                </View>

                {/* --- YÊU CẦU THAM GIA ĐANG CHỜ (PENDING REQUESTS) --- */}
                {team.pendingRequests.length > 0 && (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>
                            YÊU CẦU THAM GIA ({team.pendingRequests.length})
                        </Text>

                        <View style={styles.requestListCol}>
                            {team.pendingRequests.map((req) => (
                                <View key={req.id} style={styles.requestRowItem}>
                                    <View style={styles.requestInfo}>
                                        <Text style={styles.requestName}>{req.name}</Text>
                                        <Text style={styles.requestTime}>@{req.username} • {req.requestedAt}</Text>
                                    </View>

                                    <View style={styles.requestActionBtns}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.acceptBtn]}
                                            activeOpacity={0.8}
                                            onPress={() => handleAcceptRequest(req.id)}
                                        >
                                            <Octicons name="check" size={14} color="#FFFFFF" />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.rejectBtn]}
                                            activeOpacity={0.8}
                                            onPress={() => handleRejectRequest(req.id)}
                                        >
                                            <Octicons name="x" size={14} color="#64748B" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* --- QUẢN LÝ DANH SÁCH THÀNH VIÊN --- */}
                <View style={styles.sectionCard}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.sectionTitle}>DANH SÁCH THÀNH VIÊN</Text>
                        <Text style={styles.memberCountSmall}>{team.members.length}/{team.maxMembers}</Text>
                    </View>

                    <View style={styles.memberListCol}>
                        {team.members.map((m) => {
                            const isLeader = m.role === 'LEADER';
                            return (
                                <View key={m.id} style={styles.memberRowCard}>
                                    <View style={[styles.avatarCircle, { backgroundColor: m.avatarColor }]}>
                                        <Text style={styles.avatarInitial}>{m.name.charAt(0)}</Text>
                                    </View>

                                    <View style={styles.memberDetails}>
                                        <Text style={styles.memberNameText}>{m.name}</Text>
                                        <Text style={styles.memberUsernameText}>@{m.username}</Text>
                                    </View>

                                    {isLeader ? (
                                        <View style={styles.leaderBadge}>
                                            <Text style={styles.leaderBadgeText}>LEADER</Text>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            style={styles.kickBtn}
                                            activeOpacity={0.7}
                                            onPress={() => handleKickMember(m.id)}
                                        >
                                            <Octicons name="trash" size={14} color="#EF4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>

            {/* --- MODAL CHỈNH SỬA THÔNG TIN NHÓM --- */}
            <Modal visible={isEditModalOpen} transparent animationType="slide" onRequestClose={() => setIsEditModalOpen(false)}>
                <View style={styles.modalBackdrop}>
                    <TouchableWithoutFeedback onPress={() => setIsEditModalOpen(false)}>
                        <View style={styles.modalDismissArea} />
                    </TouchableWithoutFeedback>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Chỉnh sửa thông tin nhóm</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.fieldLabel}>Tên nhóm</Text>
                            <TextInput
                                style={styles.textInputBox}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="Nhập tên nhóm..."
                                placeholderTextColor="#94A3B8"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.fieldLabel}>Mô tả</Text>
                            <TextInput
                                style={[styles.textInputBox, styles.textAreaBox]}
                                value={editDesc}
                                onChangeText={setEditDesc}
                                placeholder="Nhập mô tả..."
                                placeholderTextColor="#94A3B8"
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <TouchableOpacity style={styles.confirmBtn} activeOpacity={0.85} onPress={handleSaveTeamInfo}>
                            <Text style={styles.confirmBtnText}>Lưu thay đổi</Text>
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
    teamTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 18,
        color: '#0F172A',
        includeFontPadding: false,
    },
    teamMeta: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
        includeFontPadding: false,
    },
    editIconBtn: {
        padding: 4,
    },
    teamDesc: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 14,
        color: '#475569',
        lineHeight: 20,
        includeFontPadding: false,
    },
    sectionTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#0F172A',
        includeFontPadding: false,
    },
    memberCountSmall: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        color: '#64748B',
        includeFontPadding: false,
    },
    requestListCol: {
        gap: 8,
    },
    requestRowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 12,
    },
    requestInfo: {
        gap: 2,
    },
    requestName: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#0F172A',
        includeFontPadding: false,
    },
    requestTime: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 12,
        color: '#94A3B8',
        includeFontPadding: false,
    },
    requestActionBtns: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
    },
    acceptBtn: {
        backgroundColor: '#16A34A',
    },
    rejectBtn: {
        backgroundColor: '#E2E8F0',
    },
    memberListCol: {
        gap: 8,
    },
    memberRowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderColor: '#F1F5F9',
        gap: 12,
    },
    avatarCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#0F172A',
        includeFontPadding: false,
    },
    memberDetails: {
        flex: 1,
        gap: 2,
    },
    memberNameText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#0F172A',
        includeFontPadding: false,
    },
    memberUsernameText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 12,
        color: '#94A3B8',
        includeFontPadding: false,
    },
    leaderBadge: {
        backgroundColor: '#FEF08A',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    leaderBadgeText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 10,
        color: '#854D0E',
        includeFontPadding: false,
    },
    kickBtn: {
        padding: 8,
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
    },
});