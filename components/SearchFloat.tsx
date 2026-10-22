import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    StyleSheet,
    View,
    TextInput,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Animated,
} from 'react-native';
import { Octicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface SearchFloatProps<T> {
    visible: boolean;
    data: T[];
    searchFields?: (keyof T)[];
    categoryKey?: keyof T;
    selectedCategory?: string;
    placeholder?: string;
    contentLayout?: 'wrap' | 'list';
    renderItem: (item: T, index: number) => React.ReactNode;
    renderFooterAction?: (query: string, onClose: () => void) => React.ReactNode;
    renderEmpty?: (query: string) => React.ReactNode;
    onClose: () => void;
}

export default function SearchFloat<T extends Record<string, any>>({
                                                                       visible,
                                                                       data,
                                                                       searchFields,
                                                                       categoryKey,
                                                                       selectedCategory,
                                                                       placeholder = 'Search for item',
                                                                       contentLayout = 'wrap',
                                                                       renderItem,
                                                                       renderFooterAction,
                                                                       renderEmpty,
                                                                       onClose,
                                                                   }: SearchFloatProps<T>) {
    const [searchQuery, setSearchQuery] = useState('');

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-10)).current;

    useEffect(() => {
        if (visible) {
            setSearchQuery('');
            fadeAnim.setValue(0);
            slideAnim.setValue(-10);

            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, fadeAnim, slideAnim]);

    const filteredData = useMemo(() => {
        let result = data;

        if (categoryKey && selectedCategory) {
            result = result.filter(
                (item) => String(item[categoryKey]).toUpperCase() === selectedCategory.toUpperCase()
            );
        }

        const query = searchQuery.trim().toLowerCase();
        if (!query) return result;

        return result.filter((item) => {
            if (searchFields && searchFields.length > 0) {
                return searchFields.some((field) =>
                    String(item[field] ?? '').toLowerCase().includes(query)
                );
            }
            return Object.values(item).some((val) =>
                String(val ?? '').toLowerCase().includes(query)
            );
        });
    }, [data, searchFields, categoryKey, selectedCategory, searchQuery]);

    const handleClose = () => {
        setSearchQuery('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <TouchableWithoutFeedback onPress={handleClose}>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.keyboardView}
                    >
                        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                            <View style={styles.floatingWrapper}>
                                {/* Thanh Search nổi */}
                                <View style={styles.searchBarContainer}>
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder={placeholder}
                                        placeholderTextColor="#94A3B8"
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        autoFocus
                                        returnKeyType="search"
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity
                                            onPress={() => setSearchQuery('')}
                                            style={styles.clearBtn}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        >
                                            <Octicons name="x-circle-fill" size={16} color="#94A3B8" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Danh sách kết quả & Action nổi */}
                                {(filteredData.length > 0 || searchQuery.trim().length > 0) && (
                                    <Animated.View
                                        style={[
                                            styles.resultsContainer,
                                            {
                                                opacity: fadeAnim,
                                                transform: [{ translateY: slideAnim }],
                                            },
                                        ]}
                                    >
                                        <ScrollView
                                            style={styles.resultsScrollView}
                                            contentContainerStyle={[
                                                styles.resultsContent,
                                                contentLayout === 'wrap' ? styles.layoutWrap : styles.layoutList,
                                            ]}
                                            keyboardShouldPersistTaps="handled"
                                            showsVerticalScrollIndicator={false}
                                        >
                                            {filteredData.map((item, index) => renderItem(item, index))}

                                            {filteredData.length === 0 && renderEmpty && renderEmpty(searchQuery)}
                                        </ScrollView>

                                        {/* Nút thêm món mới đặt nổi bật bên dưới danh sách kết quả */}
                                        {renderFooterAction && renderFooterAction(searchQuery, handleClose)}
                                    </Animated.View>
                                )}
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: 24,
    },
    keyboardView: {
        width: '100%',
    },
    floatingWrapper: {
        width: '100%',
    },
    searchBarContainer: {
        width: '100%',
        height: 52,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingHorizontal: 16,
        justifyContent: 'center',
    },
    searchInput: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 15,
        color: '#0F172A',
        textAlign: 'center',
        padding: 0,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    clearBtn: {
        position: 'absolute',
        right: 14,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultsContainer: {
        width: '100%',
        marginTop: 10,
    },
    resultsScrollView: {
        width: '100%',
        maxHeight: SCREEN_HEIGHT * 0.45,
    },
    resultsContent: {
        paddingVertical: 4,
    },
    layoutWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 8,
    },
    layoutList: {
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 8,
    },
});