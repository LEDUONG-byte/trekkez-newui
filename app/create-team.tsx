import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Octicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import ConfirmModal from "../components/ConfirmModal";
import PrimaryButton from "../components/PrimaryButton";

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
];

export default function CreateTeamScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Form States
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState("8");
  const [isPublic, setIsPublic] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);

  // Error / Validation Modal
  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    title: string;
    content: string;
  }>({
    visible: false,
    title: "",
    content: "",
  });

  const handleCreateTeam = () => {
    const trimmedName = teamName.trim();
    if (!trimmedName) {
      setErrorModal({
        visible: true,
        title: "Missing Team Name",
        content: "Please enter a name for your team before proceeding.",
      });
      return;
    }

    const parsedMax = parseInt(maxMembers, 10);
    if (isNaN(parsedMax) || parsedMax < 2 || parsedMax > 50) {
      setErrorModal({
        visible: true,
        title: "Invalid Members Limit",
        content: "Member limit must be a valid number between 2 and 50.",
      });
      return;
    }

    router.replace({
      pathname: "/manage-team",
      params: {
        id: `team_${Date.now()}`,
        name: trimmedName,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* --- STANDARDIZED HEADER --- */}
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

          <Text style={styles.headerTitle}>CREATE TEAM</Text>

          <View style={styles.placeholderRight} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* --- AVATAR SELECTION --- */}
          <View style={styles.sectionCard}>
            <Text style={styles.fieldLabel}>Team Avatar</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.avatarRow}
            >
              {AVATAR_PRESETS.map((url, index) => {
                const isSelected = selectedAvatar === url;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.avatarWrapper,
                      isSelected && styles.avatarWrapperSelected,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setSelectedAvatar(url)}
                  >
                    <Image
                      source={{ uri: url }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                    {isSelected && (
                      <View style={styles.avatarSelectedBadge}>
                        <Octicons name="check" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* --- GENERAL INFORMATION --- */}
          <View style={styles.sectionCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Team Name</Text>
              <TextInput
                style={styles.textInputBox}
                value={teamName}
                onChangeText={setTeamName}
                placeholder="e.g. Sixseven Trekking Group"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Maximum Members</Text>
              <TextInput
                style={styles.textInputBox}
                value={maxMembers}
                onChangeText={setMaxMembers}
                placeholder="Recommended: 4 - 12"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.textInputBox, styles.textAreaBox]}
                value={description}
                onChangeText={setDescription}
                placeholder="Share details about your group, upcoming routes, or required skills..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          {/* --- PRIVACY TOGGLE --- */}
          <View style={styles.sectionCard}>
            <Text style={styles.fieldLabel}>Privacy Setting</Text>
            <View style={styles.privacyOptionRow}>
              <TouchableOpacity
                style={[styles.privacyBtn, isPublic && styles.privacyBtnActive]}
                activeOpacity={0.8}
                onPress={() => setIsPublic(true)}
              >
                <Octicons
                  name="globe"
                  size={16}
                  color={isPublic ? "#FFFFFF" : "#64748B"}
                />
                <View style={styles.privacyTextCol}>
                  <Text
                    style={[
                      styles.privacyTitleText,
                      isPublic && styles.privacyTitleActive,
                    ]}
                  >
                    Public Team
                  </Text>
                  <Text
                    style={[
                      styles.privacyDescText,
                      isPublic && styles.privacyDescActive,
                    ]}
                  >
                    Visible on Find Team map
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.privacyBtn,
                  !isPublic && styles.privacyBtnActive,
                ]}
                activeOpacity={0.8}
                onPress={() => setIsPublic(false)}
              >
                <Octicons
                  name="lock"
                  size={16}
                  color={!isPublic ? "#FFFFFF" : "#64748B"}
                />
                <View style={styles.privacyTextCol}>
                  <Text
                    style={[
                      styles.privacyTitleText,
                      !isPublic && styles.privacyTitleActive,
                    ]}
                  >
                    Private Team
                  </Text>
                  <Text
                    style={[
                      styles.privacyDescText,
                      !isPublic && styles.privacyDescActive,
                    ]}
                  >
                    Invite-only or by approval
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- BOTTOM CREATE BUTTON (DÙNG PRIMARYBUTTON) --- */}
      <View
        style={[
          styles.bottomContainer,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <PrimaryButton
          title="Create Team"
          disabled={!teamName.trim()}
          onPress={handleCreateTeam}
        />
      </View>

      {/* --- CONFIRMATION / ERROR MODAL --- */}
      <ConfirmModal
        visible={errorModal.visible}
        title={errorModal.title}
        content={errorModal.content}
        confirmText="OK"
        cancelText="Close"
        onCancel={() => setErrorModal((prev) => ({ ...prev, visible: false }))}
        onConfirm={() => setErrorModal((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  keyboardContainer: {
    flex: 1,
  },
  headerContainer: {
    width: "100%",
    backgroundColor: "transparent",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 12,
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: "GoogleSans-Bold",
    fontSize: 22,
    color: "#0F172A",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  placeholderRight: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderColor: "#E2E8F0",
    padding: 18,
    gap: 14,
  },
  fieldLabel: {
    fontFamily: "GoogleSans-Bold",
    fontSize: 14,
    color: "#0F172A",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 4,
  },
  avatarWrapper: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2.5,
    borderColor: "#E2E8F0",
    padding: 2,
    position: "relative",
  },
  avatarWrapperSelected: {
    borderColor: "#207BFB",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 9999,
  },
  avatarSelectedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#207BFB",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  inputGroup: {
    gap: 6,
  },
  textInputBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    fontFamily: "GoogleSans-Regular",
    fontSize: 15,
    color: "#0F172A",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  textAreaBox: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  privacyOptionRow: {
    gap: 10,
  },
  privacyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  privacyBtnActive: {
    backgroundColor: "#1E293B",
    borderColor: "#1E293B",
  },
  privacyTextCol: {
    flex: 1,
    gap: 2,
  },
  privacyTitleText: {
    fontFamily: "GoogleSans-Bold",
    fontSize: 15,
    color: "#0F172A",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  privacyTitleActive: {
    color: "#FFFFFF",
  },
  privacyDescText: {
    fontFamily: "GoogleSans-Regular",
    fontSize: 12,
    color: "#64748B",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  privacyDescActive: {
    color: "#CBD5E1",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "transparent",
  },
});
