import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Octicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {
  getRemoteNotifications,
  type UserNotification,
} from "../api/services/notifications/notifications-supabase";

function formatNotificationDate(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Date(timestamp).toLocaleString();
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setNotifications(await getRemoteNotifications());
    } catch (loadError) {
      setNotifications([]);
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const renderNotification = ({ item }: { item: UserNotification }) => (
    <View style={styles.notificationRow}>
      <View style={styles.notificationIcon}>
        <Octicons
          name={item.type === "team" ? "people" : "bell"}
          size={18}
          color="#0369A1"
        />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationBody}>{item.body}</Text>
        <Text style={styles.notificationDate}>
          {formatNotificationDate(item.createdAt)}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Octicons name="chevron-left" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      {error ? (
        <View style={styles.messageContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => { void load(); }}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : loading && notifications.length === 0 ? (
        <View style={styles.messageContainer}>
          <ActivityIndicator color="#0284C7" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={
            notifications.length === 0 ? styles.emptyList : styles.listContent
          }
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => { void load(); }} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Octicons name="bell" size={23} color="#64748B" />
              </View>
              <Text style={styles.emptyTitle}>You’re all caught up</Text>
              <Text style={styles.emptyBody}>New notifications will show up here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    width: 36,
    height: 40,
    justifyContent: "center",
  },
  headerTitle: {
    color: "#0F172A",
    fontFamily: "GoogleSans-Bold",
    fontSize: 17,
  },
  headerSpacer: {
    width: 36,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 13,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  notificationIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0F2FE",
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    color: "#0F172A",
    fontFamily: "GoogleSans-Bold",
    fontSize: 14,
  },
  notificationBody: {
    color: "#475569",
    fontFamily: "GoogleSans-Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  notificationDate: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 3,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2E8F0",
    marginBottom: 14,
  },
  emptyTitle: {
    color: "#0F172A",
    fontFamily: "GoogleSans-Bold",
    fontSize: 16,
  },
  emptyBody: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },
  messageContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    textAlign: "center",
  },
  retryText: {
    color: "#0284C7",
    fontFamily: "GoogleSans-Bold",
    fontSize: 14,
  },
});
