import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Image,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
    const router = useRouter();

    const handleGoogleLogin = () => {
        // Xử lý đăng nhập Google tại đây
        router.replace('/(tabs)');
    };

    const handleEmailLogin = () => {
        // Xử lý hoặc chuyển sang trang nhập Email/Password
        router.replace('/(tabs)');
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

            </View>
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