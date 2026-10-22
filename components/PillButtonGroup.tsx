import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

interface OptionItem<T extends string = string> {
    label: string;
    value: T;
}

interface PillButtonGroupProps<T extends string = string> {
    options: (string | OptionItem<T>)[];
    selectedValue?: T | string | string[];
    onSelect: (value: T) => void;
    size?: 'medium' | 'large';
    direction?: 'wrap' | 'row';
}

export default function PillButtonGroup<T extends string = string>({
                                                                       options,
                                                                       selectedValue,
                                                                       onSelect,
                                                                       size = 'medium',
                                                                       direction = 'wrap',
                                                                   }: PillButtonGroupProps<T>) {
    const isLarge = size === 'large';
    const containerStyle = direction === 'row' ? styles.pillGroupRow : styles.pillGroup;

    const isOptionSelected = (optValue: string) => {
        if (Array.isArray(selectedValue)) {
            return selectedValue.includes(optValue);
        }
        return selectedValue === optValue;
    };

    return (
        <View style={containerStyle}>
            {options.map((opt) => {
                const optLabel = typeof opt === 'string' ? opt : opt.label;
                const optValue = (typeof opt === 'string' ? opt : opt.value) as T;
                const active = isOptionSelected(optValue);

                return (
                    <TouchableOpacity
                        key={optValue}
                        style={[
                            isLarge ? styles.pillBtnLg : styles.pillBtn,
                            active && (isLarge ? styles.pillBtnActiveLg : styles.pillBtnActive),
                        ]}
                        activeOpacity={0.7}
                        onPress={() => onSelect(optValue)}
                    >
                        <Text
                            style={[
                                isLarge ? styles.pillTextLg : styles.pillText,
                                active && (isLarge ? styles.pillTextActiveLg : styles.pillTextActive),
                            ]}
                        >
                            {optLabel}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    pillGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    pillGroupRow: {
        flexDirection: 'row',
        gap: 12,
    },
    pillBtn: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    pillBtnActive: {
        backgroundColor: '#3B82F6',
    },
    pillBtnLg: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 24,
    },
    pillBtnActiveLg: {
        backgroundColor: '#3B82F6',
    },
    pillText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        color: '#64748B',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    pillTextActive: {
        color: '#FFFFFF',
    },
    pillTextLg: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#64748B',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    pillTextActiveLg: {
        color: '#FFFFFF',
    },
});