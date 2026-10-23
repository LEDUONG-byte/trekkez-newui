import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Image,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Octicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

import ConfirmModal from "../components/ConfirmModal";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface TeamMemberItem {
  id: string;
  name: string;
  username: string;
  role: "LEADER" | "MEMBER";
  avatarUrl?: string | null;
}

export interface JoinRequestItem {
  id: string;
  name: string;
  username: string;
  requestedAt?: string;
  avatarUrl?: string | null;
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
  id: "team_01",
  name: "Sixseven Team",
  description:
    "Chuyên leo núi, trekking các cung đường Tây Bắc và cắm trại cuối tuần. Luôn đón chào các thành viên có chung đam mê khám phá thiên nhiên!",
  isPublic: false,
  maxMembers: 10,
  members: [
    {
      id: "u1",
      name: "Lê Dương",
      username: "leduong232",
      role: "LEADER",
      avatarUrl:
        "https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&q=80&w=200",
    },
    {
      id: "u2",
      name: "Lê Dương",
      username: "leduong232",
      role: "MEMBER",
      avatarUrl:
        "https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&q=80&w=200",
    },
    {
      id: "u3",
      name: "Lê Dương",
      username: "leduong232",
      role: "MEMBER",
      avatarUrl:
        "https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&q=80&w=200",
    },
    {
      id: "u4",
      name: "Lê Dương",
      username: "leduong232",
      role: "MEMBER",
      avatarUrl:
        "https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&q=80&w=200",
    },
  ],
  pendingRequests: [
    {
      id: "req_1",
      name: "Lê Dương",
      username: "leduong232",
      avatarUrl:
        "https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&q=80&w=200",
    },
  ],
};

export default function ManageTeamScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();

  const [team, setTeam] = useState<TeamManageData>(MOCK_TEAM_MANAGE);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(team.name);
  const [editDesc, setEditDesc] = useState(team.description);
  const [editMaxMembers, setEditMaxMembers] = useState(String(team.maxMembers));

  // Animated spring slide cho Edit Sheet
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (isEditModalOpen) {
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 24,
        mass: 0.85,
        stiffness: 130,
      }).start();
    }
  }, [isEditModalOpen, slideAnim]);

  const handleCloseEditModal = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setIsEditModalOpen(false);
    });
  };

  // State điều khiển ConfirmModal
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    content: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
    onConfirm: () => void;
  }>({
    visible: false,
    title: "",
    content: "",
    onConfirm: () => {},
  });

  const handleOpenEditModal = () => {
    setEditName(team.name);
    setEditDesc(team.description);
    setEditMaxMembers(String(team.maxMembers));
    setIsEditModalOpen(true);
  };

  const handleAcceptRequest = (reqId: string) => {
    const req = team.pendingRequests.find((r) => r.id === reqId);
    if (!req) return;

    if (team.members.length >= team.maxMembers) {
      setConfirmModal({
        visible: true,
        title: "Team is Full",
        content: `This team has reached the limit of ${team.maxMembers} members. Please increase the max member count before adding more.`,
        confirmText: "OK",
        cancelText: "Close",
        destructive: false,
        onConfirm: () =>
          setConfirmModal((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    const newMember: TeamMemberItem = {
      id: req.id,
      name: req.name,
      username: req.username,
      role: "MEMBER",
      avatarUrl: req.avatarUrl,
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
    setConfirmModal({
      visible: true,
      title: "Remove Member",
      content: "Are you sure you want to remove this member?",
      confirmText: "Remove",
      cancelText: "Cancel",
      destructive: true,
      onConfirm: () => {
        setTeam((prev) => ({
          ...prev,
          members: prev.members.filter((m) => m.id !== memberId),
        }));
        setConfirmModal((prev) => ({ ...prev, visible: false }));
      },
    });
  };

  const handleSaveTeamInfo = () => {
    const parsedMax = parseInt(editMaxMembers, 10);
    if (isNaN(parsedMax) || parsedMax <= 0) {
      setConfirmModal({
        visible: true,
        title: "Invalid Number",
        content: "Please enter a valid number of members.",
        confirmText: "OK",
        cancelText: "Cancel",
        destructive: false,
        onConfirm: () =>
          setConfirmModal((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    if (parsedMax < team.members.length) {
      setConfirmModal({
        visible: true,
        title: "Invalid Max Members",
        content: `Cannot set max members to ${parsedMax} because the team currently has ${team.members.length} members.`,
        confirmText: "OK",
        cancelText: "Cancel",
        destructive: false,
        onConfirm: () =>
          setConfirmModal((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    setTeam((prev) => ({
      ...prev,
      name: editName.trim() || prev.name,
      description: editDesc.trim(),
      maxMembers: parsedMax,
    }));
    handleCloseEditModal();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* --- HEADER CHUẨN ĐỒNG BỘ --- */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Octicons name="chevron-left" size={24} color="#94A3B8" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>MANAGE TEAM</Text>

        <View style={styles.placeholderRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* --- THẺ TÊN TEAM & SỐ LƯỢNG THÀNH VIÊN --- */}
        <View style={styles.teamNameCard}>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {team.members.length}/{team.maxMembers}
            </Text>
          </View>
          <Text style={styles.teamNameText} numberOfLines={1}>
            {team.name}
          </Text>
        </View>

        {/* --- THẺ ĐOẠN VĂN MÔ TẢ (DESCRIPTIVE PARAGRAPH) --- */}
        <View style={styles.descCard}>
          <Text style={styles.descText}>
            {team.description || "<descriptive paragraph>"}
          </Text>
        </View>

        {/* --- DANH SÁCH YÊU CẦU THAM GIA (PENDING REQUESTS) --- */}
        {team.pendingRequests.map((req) => (
          <View key={req.id} style={styles.userCard}>
            {req.avatarUrl ? (
              <Image
                source={{ uri: req.avatarUrl }}
                style={styles.userAvatar}
              />
            ) : (
              <View style={styles.userAvatarPlaceholder}>
                <Text style={styles.userAvatarInitial}>
                  {req.name.charAt(0)}
                </Text>
              </View>
            )}

            <View style={styles.userInfo}>
              <Text style={styles.userNameText} numberOfLines={1}>
                {req.name}
              </Text>
              <Text style={styles.userSubText} numberOfLines={1}>
                {req.username}
              </Text>
            </View>

            <View style={styles.requestActionsRow}>
              <TouchableOpacity
                style={styles.checkBtn}
                activeOpacity={0.8}
                onPress={() => handleAcceptRequest(req.id)}
              >
                <Octicons name="check" size={16} color="#0F172A" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rejectBtn}
                activeOpacity={0.8}
                onPress={() => handleRejectRequest(req.id)}
              >
                <Octicons name="x" size={16} color="#0F172A" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* --- DANH SÁCH THÀNH VIÊN HIỆN TẠI (MEMBERS) --- */}
        {team.members.map((m) => (
          <View key={m.id} style={styles.userCard}>
            {m.avatarUrl ? (
              <Image source={{ uri: m.avatarUrl }} style={styles.userAvatar} />
            ) : (
              <View style={styles.userAvatarPlaceholder}>
                <Text style={styles.userAvatarInitial}>{m.name.charAt(0)}</Text>
              </View>
            )}

            <View style={styles.userInfo}>
              <Text style={styles.userNameText} numberOfLines={1}>
                {m.name}
              </Text>
              <Text style={styles.userSubText} numberOfLines={1}>
                {m.username}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.trashBtn}
              activeOpacity={0.7}
              onPress={() => handleKickMember(m.id)}
            >
              <Octicons name="trash" size={16} color="#475569" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* --- NÚT EDIT CỐ ĐỊNH Ở ĐÁY MÀN HÌNH --- */}
      <View
        style={[
          styles.bottomButtonContainer,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <TouchableOpacity
          style={styles.editBottomBtn}
          activeOpacity={0.85}
          onPress={handleOpenEditModal}
        >
          <Text style={styles.editBottomBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* --- BOTTOM SHEET CHỈNH SỬA THÔNG TIN NHÓM (ANIMATED SPRING) --- */}
      <Modal
        visible={isEditModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseEditModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalDismissTouchable}
            activeOpacity={1}
            onPress={handleCloseEditModal}
          />

          <Animated.View
            style={[
              styles.modalSheet,
              {
                paddingBottom: Math.max(insets.bottom, 24),
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.modalDragHandle} />

            <Text style={styles.modalTitle}>Edit Team Info</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Team Name</Text>
              <TextInput
                style={styles.textInputBox}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter team name..."
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Max Members</Text>
              <TextInput
                style={styles.textInputBox}
                value={editMaxMembers}
                onChangeText={setEditMaxMembers}
                placeholder="Enter max members limit..."
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
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
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity
              style={styles.confirmBtn}
              activeOpacity={0.85}
              onPress={handleSaveTeamInfo}
            >
              <Text style={styles.confirmBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- COMPONENT XÁC NHẬN THAY CHO ALERT MẶC ĐỊNH --- */}
      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        content={confirmModal.content}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        destructive={confirmModal.destructive}
        onCancel={() =>
          setConfirmModal((prev) => ({ ...prev, visible: false }))
        }
        onConfirm={confirmModal.onConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontFamily: "GoogleSans-Bold",
    fontSize: 20,
    color: "#0F172A",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  placeholderRight: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 110,
    gap: 12,
  },

  // 1. Thẻ Tên Team & Badge
  teamNameCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 16,
  },
  countBadge: {
    backgroundColor: "#EBF5FF",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  countBadgeText: {
    fontFamily: "GoogleSans-Bold",
    fontSize: 14,
    color: "#3B82F6",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  teamNameText: {
    flex: 1,
    fontFamily: "GoogleSans-Bold",
    fontSize: 16,
    color: "#64748B",
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  // 2. Thẻ Đoạn văn mô tả
  descCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    minHeight: 180,
  },
  descText: {
    fontFamily: "GoogleSans-Regular",
    fontSize: 15,
    color: "#334155",
    lineHeight: 22,
    includeFontPadding: false,
    textAlignVertical: "top",
  },

  // 3. Thẻ Card người dùng
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
  },
  userAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
  },
  userAvatarInitial: {
    fontFamily: "GoogleSans-Bold",
    fontSize: 18,
    color: "#0284C7",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
    gap: 2,
  },
  userNameText: {
    fontFamily: "GoogleSans-Bold",
    fontSize: 15,
    color: "#0F172A",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  userSubText: {
    fontFamily: "GoogleSans-Regular",
    fontSize: 13,
    color: "#64748B",
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  // Nút tương tác trên Card
  requestActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#38BDF8",
    justifyContent: "center",
    alignItems: "center",
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FDE68A",
    justifyContent: "center",
    alignItems: "center",
  },
  trashBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  // Nút Edit cố định đáy
  bottomButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#F4F5F7",
  },
  editBottomBtn: {
    backgroundColor: "#181A20",
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  editBottomBtnText: {
    fontFamily: "GoogleSans-Bold",
    fontSize: 16,
    color: "#FFFFFF",
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  // Modal Bottom Sheet với Spring Animation
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalDismissTouchable: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 14,
    gap: 14,
  },
  modalDragHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: "GoogleSans-Bold",
    fontSize: 18,
    color: "#0F172A",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  inputGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: "GoogleSans-Bold",
    fontSize: 13,
    color: "#475569",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  textInputBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontFamily: "GoogleSans-Regular",
    fontSize: 14,
    color: "#0F172A",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  textAreaBox: {
    height: 96,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  confirmBtn: {
    backgroundColor: "#181A20",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  confirmBtnText: {
    fontFamily: "GoogleSans-Bold",
    fontSize: 15,
    color: "#FFFFFF",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
