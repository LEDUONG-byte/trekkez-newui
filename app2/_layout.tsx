import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Giữ Splash Screen hiển thị trong lúc load dữ liệu
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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