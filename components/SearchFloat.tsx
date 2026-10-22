import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { Octicons } from '@expo/vector-icons';

export interface SearchFloatProps<T> {
    visible: boolean;
    data: T[];
    searchFields?: (keyof T)[];
    categoryKey?: keyof T;
    selectedCategory?: string;
    placeholder?: string;

    // Layout dạng 'wrap' (cho pill/tag đồ đạc) hoặc 'list' (cho danh sách dạng hàng như User)
    contentLayout?: 'wrap' | 'list';

    // Render Prop tùy chỉnh từng item
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
                                {/* Thanh Search nổi tỉ lệ chuẩn 52px */}
                                <View style={styles.searchBarContainer}>
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder={placeholder}
                                        placeholderTextColor="#64748B"
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        autoFocus
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity
                                            onPress={() => setSearchQuery('')}
                                            style={styles.clearBtn}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Octicons name="x-circle-fill" size={16} color="#94A3B8" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Nội dung kết quả vừa vặn ngay bên dưới */}
                                {(filteredData.length > 0 || searchQuery.trim().length > 0) && (
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

                                        {renderFooterAction && renderFooterAction(searchQuery, handleClose)}
                                    </ScrollView>
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
        paddingHorizontal: 20,
    },
    keyboardView: {
        width: '100%',
    },
    floatingWrapper: {
        width: '100%',
    },
    searchBarContainer: {
        width: '100%',
        height: 60,
        backgroundColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 14,
        justifyContent: 'center',
        includeFontPadding: false,
    },
    searchInput: {
        fontFamily: 'GoogleSans',
        fontSize: 15,
        color: '#58595d',
        textAlign: 'center',
        padding: 0,
        includeFontPadding: false,
    },
    clearBtn: {
        position: 'absolute',
        right: 14,
    },
    resultsScrollView: {
        width: '100%',
        marginTop: 8,
    },
    resultsContent: {
        paddingVertical: 2,
    },
    layoutWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: 8,
    },
    layoutList: {
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 8,
    },
});