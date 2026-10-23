import React, { useRef, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ViewStyle,
} from 'react-native';
import { Octicons } from '@expo/vector-icons';

export interface SearchBarHeaderProps {
    title: string;
    isSearching: boolean;
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    onStartSearch: () => void;
    onCancelSearch: () => void;
    onNotificationsPress?: () => void;
    placeholder?: string;
    containerStyle?: ViewStyle;
}

export default function SearchBarHeader({
                                            title,
                                            isSearching,
                                            searchQuery,
                                            onSearchQueryChange,
                                            onStartSearch,
                                            onCancelSearch,
                                            onNotificationsPress,
                                            placeholder = 'Search...',
                                            containerStyle,
                                        }: SearchBarHeaderProps) {
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (isSearching) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [isSearching]);

    if (isSearching) {
        return (
            <View style={[styles.searchBarHeader, containerStyle]}>
                <View style={styles.searchInputContainer}>
                    <Octicons name="search" size={16} color="#64748B" />
                    <TextInput
                        ref={inputRef}
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={onSearchQueryChange}
                        placeholder={placeholder}
                        placeholderTextColor="#94A3B8"
                        returnKeyType="search"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            style={styles.clearSearchBtn}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            onPress={() => onSearchQueryChange('')}
                        >
                            <Octicons name="x" size={14} color="#64748B" />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.cancelSearchBtn}
                    activeOpacity={0.7}
                    onPress={onCancelSearch}
                >
                    <Text style={styles.cancelSearchText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.headerBar, containerStyle]}>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={styles.headerRightBtns}>
                {onNotificationsPress ? (
                    <TouchableOpacity
                        style={styles.circleHeaderBtn}
                        activeOpacity={0.7}
                        accessibilityLabel="Notifications"
                        onPress={onNotificationsPress}
                    >
                        <Octicons name="bell" size={18} color="#0F172A" />
                    </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                    style={styles.circleHeaderBtn}
                    activeOpacity={0.7}
                    onPress={onStartSearch}
                >
                    <Octicons name="search" size={18} color="#0F172A" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        height: 44,
    },
    headerTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 22,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    headerRightBtns: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    circleHeaderBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchBarHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
        height: 44,
    },
    searchInputContainer: {
        flex: 1,
        height: 44,
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'GoogleSans-Regular',
        fontSize: 14,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
        paddingVertical: 0,
    },
    clearSearchBtn: {
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelSearchBtn: {
        paddingHorizontal: 6,
        paddingVertical: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelSearchText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#64748B',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
});