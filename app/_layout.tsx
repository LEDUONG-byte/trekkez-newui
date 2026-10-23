import { useEffect, useRef } from 'react';
import { Stack, usePathname, useRootNavigationState, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Giữ Splash Screen hiển thị trong lúc load dữ liệu
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const router = useRouter();
    const pathname = usePathname();
    const navigationState = useRootNavigationState();
    const startupRedirectHandled = useRef(false);
    const [loaded, error] = useFonts({
        'GoogleSans-Regular': require('../assets/fonts/GoogleSans-Regular.ttf'),
        'GoogleSans-Medium': require('../assets/fonts/GoogleSans-Medium.ttf'),
        'GoogleSans-Bold': require('../assets/fonts/GoogleSans-Bold.ttf'),
    });

    useEffect(() => {
        if (loaded || error) {
            // Tắt Splash Screen sau khi load xong font
            SplashScreen.hideAsync();
        }
    }, [loaded, error]);

    useEffect(() => {
        if (!loaded || !navigationState?.key || startupRedirectHandled.current) return;
        startupRedirectHandled.current = true;
        if (pathname === '/') {
            router.replace('/onboarding');
        }
    }, [loaded, navigationState?.key, pathname, router]);

    if (!loaded && !error) {
        return null;
    }

    return (
        <Stack screenOptions={{ headerShown: false }} initialRouteName="onboarding">
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
        </Stack>
    );
}