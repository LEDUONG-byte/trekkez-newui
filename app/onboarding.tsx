import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    Dimensions,
    TouchableOpacity,
    Animated,
    Platform,
    Image,
    ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

interface OnboardingItem {
    id: string;
    subtitle: string;
    title: string;
    image: ImageSourcePropType;
    badgeText?: string;
}

const PAGES: OnboardingItem[] = [
    {
        id: '1',
        subtitle: 'Every journey, in one place',
        title: 'Explore routes\nSave them to trekkEZ',
        image: require('../assets/images/onboarding1.png'),
    },
    {
        id: '2',
        subtitle: 'Missing teammates?',
        title: 'Teammate matchmaking\nTogether, wherever ',
        image: require('../assets/images/onboarding2.png'),
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    const handleNext = () => {
        if (currentIndex < PAGES.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: currentIndex + 1,
                animated: true,
            });
        } else {
            router.replace('/login');
        } // <--- Thêm dấu ngoặc đóng ở đây
    }; // <--- Thêm dấu chấm phẩy ở đây

    const renderItem = ({ item }: { item: OnboardingItem }) => {
        return (
            <View style={styles.pageContainer}>
                {/* Phần tiêu đề */}
                <View style={styles.headerContainer}>
                    <Text style={styles.subtitle}>{item.subtitle}</Text>
                    <Text style={styles.title}>{item.title}</Text>
                </View>

                {/* Vùng minh họa */}
                <View style={styles.illustrationWrapper}>
                    <Image
                        source={item.image}
                        style={styles.illustrationImage}
                        resizeMode="contain"
                    />
                    {item.badgeText && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{item.badgeText}</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Danh sách trượt ngang */}
            <FlatList
                ref={flatListRef}
                data={PAGES}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onMomentumScrollEnd={(event) => {
                    const index = Math.round(
                        event.nativeEvent.contentOffset.x / width
                    );
                    setCurrentIndex(index);
                }}
            />

            {/* Dấu chấm chuyển trang */}
            <View style={styles.paginationContainer}>
                {PAGES.map((_, index) => {
                    const isSelected = index === currentIndex;
                    return (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                isSelected ? styles.activeDot : styles.inactiveDot,
                            ]}
                        />
                    );
                })}
            </View>

            {/* Nút Chuyển trang */}
            <View style={styles.bottomContainer}>
                <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={handleNext}>
                    <Text style={styles.buttonText}>
                        {currentIndex === PAGES.length - 1 ? 'Get started' : 'Next'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    pageContainer: {
        width: width,
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: height * 0.08,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    subtitle: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 15,
        color: '#38BDF8',
        marginBottom: 12,
        textAlign: 'center',
    },
    title: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 22,
        color: '#0F172A',
        textAlign: 'center',
        lineHeight: 32,
    },
    illustrationWrapper: {
        width: width * 0.75,
        height: width * 0.75,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        position: 'relative',
    },
    illustrationImage: {
        width: '100%',
        height: '100%',
    },
    badge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#38BDF8',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeText: {
        fontFamily: 'GoogleSans-Bold',
        color: '#FFFFFF',
        fontSize: 13,
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    activeDot: {
        width: 24,
        backgroundColor: '#475569',
    },
    inactiveDot: {
        width: 8,
        backgroundColor: '#CBD5E1',
    },
    bottomContainer: {
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === 'ios' ? 12 : 24,
    },
    button: {
        height: 56,
        backgroundColor: '#1E293B',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        fontFamily: 'GoogleSans-Bold',
        color: '#FFFFFF',
        fontSize: 16,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
});