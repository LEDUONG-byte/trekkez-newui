import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { newUiAuth } from '../api/integration/newui-gateway';
import { getAuthSession } from '../api/services/auth/auth-session';
import { getProfileById, type SupabaseProfile } from '../api/services/account/account-supabase';

export default function SettingScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<SupabaseProfile | null>(null);
    const [email, setEmail] = useState('');
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileError, setProfileError] = useState('');

    const handleEditProfile = () => {
        router.push('/edit-profile');
    };

    const loadProfile = useCallback(async (isActive: () => boolean = () => true) => {
        setLoadingProfile(true);
        setProfileError('');
        try {
            const session = await getAuthSession();
            if (!session?.userId || !session.accessToken) {
                throw new Error('Vui lòng đăng nhập để xem thông tin tài khoản.');
            }

            const currentProfile = await getProfileById(session.accessToken, session.userId);
            if (isActive()) {
                setProfile(currentProfile);
                setEmail(session.email || '');
            }
        } catch (error) {
            if (isActive()) {
                setProfile(null);
                setEmail('');
                setProfileError(error instanceof Error ? error.message : String(error));
            }
        } finally {
            if (isActive()) setLoadingProfile(false);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        let active = true;
        void loadProfile(() => active);
        return () => {
            active = false;
        };
    }, [loadProfile]));

    const handleTermsOfService = () => {
        // Open Terms of Service
    };

    const handlePrivacyPolicy = () => {
        // Open Privacy Policy
    };

    const performLogout = async () => {
        try {
            await newUiAuth.signOut();
            router.replace('/login');
        } catch (error) {
            Alert.alert(
                'Could not log out',
                error instanceof Error ? error.message : String(error),
            );
        }
    };

    const handleLogout = () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out',
                style: 'destructive',
                onPress: () => { void performLogout(); },
            },
        ]);
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'All your data will be permanently deleted. Are you sure you want to proceed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        // Account deletion logic
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* --- HEADER CONTAINER --- */}
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

                    <Text style={styles.headerTitle}>SETTING</Text>

                    <View style={styles.placeholderRight} />
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* --- PROFILE CARD --- */}
                <View style={styles.profileCard}>
                    <View style={styles.profileLeft}>
                        <Image
                            source={profile?.avatar_url
                                ? { uri: profile.avatar_url }
                                : require('../assets/images/logoW.png')}
                            style={styles.avatarImage}
                        />

                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName} numberOfLines={1}>
                                {profile?.full_name || profile?.username || 'TrekkEZ user'}
                            </Text>
                            <Text style={styles.profileEmail} numberOfLines={1}>
                                {email || 'Email not available'}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.editBtn}
                        activeOpacity={0.7}
                        onPress={handleEditProfile}
                    >
                        <Octicons name="pencil" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                </View>
                {loadingProfile ? (
                    <ActivityIndicator color="#0284C7" />
                ) : profileError ? (
                    <TouchableOpacity onPress={() => { void loadProfile(); }}>
                        <Text style={styles.profileError}>{profileError} (tap to retry)</Text>
                    </TouchableOpacity>
                ) : null}

                {/* --- SECTION 1: TERMS & POLICIES --- */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionHeaderTitle}>Terms & Policies</Text>

                    <View style={styles.cardGroup}>
                        <TouchableOpacity
                            style={styles.cardItem}
                            activeOpacity={0.7}
                            onPress={handleTermsOfService}
                        >
                            <Text style={styles.cardItemText}>Terms of Service</Text>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.cardItem}
                            activeOpacity={0.7}
                            onPress={handlePrivacyPolicy}
                        >
                            <Text style={styles.cardItemText}>Privacy Policy</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* --- SECTION 2: ACCOUNT --- */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionHeaderTitle}>Account</Text>

                    <View style={styles.cardGroup}>
                        <TouchableOpacity
                            style={styles.cardItem}
                            activeOpacity={0.7}
                            onPress={handleLogout}
                        >
                            <Text style={styles.cardItemText}>Log Out</Text>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.cardItem}
                            activeOpacity={0.7}
                            onPress={handleDeleteAccount}
                        >
                            <Text style={styles.cardItemText}>Delete Account</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* --- VERSION INFO --- */}
                <View style={styles.versionRow}>
                    <Octicons name="briefcase" size={16} color="#94A3B8" />
                    <Text style={styles.versionText}>v0.0.2 (on-dev-beta)</Text>
                </View>
            </ScrollView>
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
    placeholderRight: {
        width: 36,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 40,
        gap: 24,
    },

    // Profile Card
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 18,
    },
    profileLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
    },
    avatarImage: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#E2E8F0',
    },
    profileInfo: {
        flex: 1,
        justifyContent: 'center',
        gap: 4,
    },
    profileName: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    profileEmail: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 13,
        color: '#94A3B8',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    profileError: {
        color: '#B91C1C',
        fontSize: 13,
        paddingHorizontal: 4,
    },
    editBtn: {
        padding: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Section & Card Group
    sectionContainer: {
        gap: 10,
    },
    sectionHeaderTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#64748B',
        paddingLeft: 4,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    cardGroup: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        overflow: 'hidden',
    },
    cardItem: {
        paddingHorizontal: 20,
        paddingVertical: 18,
        justifyContent: 'center',
    },
    cardItemText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginHorizontal: 20,
    },

    // Version Info
    versionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingLeft: 6,
        marginTop: 4,
    },
    versionText: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 13,
        color: '#94A3B8',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
});