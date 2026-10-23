import React, { useEffect, useRef, useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Image,
    Dimensions,
    TextInput,
    Modal,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { newUiAuth } from '../api/integration/newui-gateway';
import { beginGoogleOAuth, finishGoogleOAuth } from '../api/services/auth/auth-session';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
    const router = useRouter();

    const [emailVisible, setEmailVisible] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [pending, setPending] = useState(false);
    const [authError, setAuthError] = useState('');
    const [googleMessage, setGoogleMessage] = useState('');
    const oauthHandled = useRef('');

    useEffect(() => {
        let alive = true;
        void newUiAuth.getAuthSession().then((session) => {
            if (alive && session?.accessToken && session.userId) router.replace('/(tabs)');
        }).catch((error) => { if (alive) console.warn('RESTORE_SESSION:', error); });
        return () => { alive = false; };
    }, [router]);

    useEffect(() => {
        let active = true;
        const handleCallback = async (url: string) => {
            // Only callbacks containing code or OAuth error should be handled.
            if (!/[?&#](?:code|error|error_description)=/.test(url) || oauthHandled.current===url) return;
            oauthHandled.current=url;
            try {
                setPending(true);
                const result = await finishGoogleOAuth(url);
                if (result?.userId && active) {
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                        window.history.replaceState(null, '', '/login');
                    }
                    router.replace('/(tabs)');
                }
            } catch (error) {
                if (active) setGoogleMessage(error instanceof Error ? error.message : String(error));
            } finally { if (active) setPending(false); }
        };
        const listener = Linking.addEventListener('url', event => { void handleCallback(event.url); });
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            void handleCallback(window.location.href);
        } else {
            void Linking.getInitialURL().then(url => { if (url) void handleCallback(url); });
        }
        return () => { active = false; listener.remove(); };
    }, [router]);

    const handleGoogleLogin = async () => {
        if (pending) return;
        setGoogleMessage('');
        setPending(true);
        try { await beginGoogleOAuth(); }
        catch (error) { setGoogleMessage(error instanceof Error ? error.message : String(error)); }
        finally { setPending(false); }
    };

    const handleEmailLogin = () => {
        setGoogleMessage('');
        setAuthError('');
        setEmailVisible(true);
    };

    const submitEmailLogin = async () => {
        if (pending) return;
        if (!email.trim() || !password) {
            setAuthError('Vui lòng nhập email và mật khẩu.');
            return;
        }
        setPending(true);
        setAuthError('');
        try {
            await newUiAuth.signInWithEmail(email.trim(), password);
            setEmailVisible(false);
            setPassword('');
            router.replace('/(tabs)');
        } catch (error) {
            setAuthError(error instanceof Error ? error.message : 'Không thể đăng nhập.');
        } finally {
            setPending(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>

                {/* Phần Logo và Slogan - Đẩy xuống một chút từ đỉnh */}
                <View style={styles.headerSection}>
                    <Image
                        source={require('../assets/images/logoW.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>Match groups, plan routes, and begin with us</Text>
                </View>

                {/* Các nút Đăng nhập - Kéo lên giữa bằng cách cách đáy một khoảng */}
                <View style={styles.buttonSection}>
                    <TouchableOpacity
                        style={styles.googleButton}
                        activeOpacity={0.8}
                        onPress={handleGoogleLogin}
                    >
                        {/* Thay Ionicons bằng Image logo Google thật */}
                        <Image
                            source={require('../assets/images/logoGoogle.webp')}
                            style={styles.googleIcon}
                            resizeMode="contain"
                        />
                        <Text style={styles.googleButtonText}>login with Google</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.emailButton}
                        activeOpacity={0.8}
                        onPress={handleEmailLogin}
                    >
                        <Ionicons name="mail" size={22} color="#1a1a1a" style={styles.btnIcon} />
                        <Text style={styles.emailButtonText}>continue with the email</Text>
                    </TouchableOpacity>

                    {/* Điều khoản sử dụng */}
                    <Text style={styles.termsText}>
                        By logging in, you agree to the{' '}
                        <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                        <Text style={styles.termsLink}>Privacy Policy</Text>.
                    </Text>
                </View>

                {googleMessage ? <Text style={{ color: '#B45309', textAlign: 'center', marginTop: 8 }}>{googleMessage}</Text> : null}
            </View>
            <Modal transparent visible={emailVisible} animationType="fade" onRequestClose={() => setEmailVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15,23,42,0.55)' }}>
                    <View style={{ backgroundColor: '#FFFFFF', padding: 24, borderRadius: 20, gap: 14 }}>
                        <Text style={{ fontSize: 22, fontWeight: '700', color: '#0F172A' }}>Sign in with Email</Text>
                        <TextInput autoCapitalize="none" keyboardType="email-address" autoComplete="email"
                            placeholder="Email" value={email} onChangeText={setEmail}
                            style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 14, color: '#0F172A' }} />
                        <TextInput secureTextEntry autoComplete="password" placeholder="Password"
                            value={password} onChangeText={setPassword}
                            onSubmitEditing={() => { void submitEmailLogin(); }}
                            style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 14, color: '#0F172A' }} />
                        {authError ? <Text style={{ color: '#DC2626' }}>{authError}</Text> : null}
                        <TouchableOpacity onPress={() => { void submitEmailLogin(); }} disabled={pending}
                            style={{ backgroundColor: '#83CFFE', borderRadius: 12, padding: 15, alignItems: 'center' }}>
                            {pending ? <ActivityIndicator color="#0F172A" /> : <Text style={{ color: '#0F172A', fontWeight: '700' }}>Sign in</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEmailVisible(false)} disabled={pending} style={{ alignItems: 'center', padding: 6 }}>
                            <Text style={{ color: '#475569' }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'space-between',
        paddingTop: height * 0.10,
        paddingBottom: height * 0.25,
    },
    headerSection: {
        alignItems: 'center',
    },
    logoImage: {
        width: 140,
        height: 140,
        marginBottom: 32,
    },
    title: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 24,
        color: '#0F172A',
        textAlign: 'center',
        lineHeight: 30,
        paddingHorizontal: 20,
    },
    buttonSection: {
        width: '100%',
        gap: 16,
    },
    googleButton: {
        height: 56,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    googleButtonText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#1E293B',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    googleIcon: {
        width: 22,
        height: 22,
        marginRight: 12,
    },
    emailButton: {
        height: 56,
        backgroundColor: '#83cffe',
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    emailButtonText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#1a1a1c',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    btnIcon: {
        marginRight: 10,
    },
    termsText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 10,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 18,
    },
    termsLink: {
        textDecorationLine: 'underline',
    },
});