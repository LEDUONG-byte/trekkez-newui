import React from 'react';
import { StyleSheet, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface PrimaryButtonProps extends TouchableOpacityProps {
    title: string;
}

export default function PrimaryButton({ title, style, ...props }: PrimaryButtonProps) {
    return (
        <TouchableOpacity style={[styles.continueBtn, style]} activeOpacity={0.8} {...props}>
            <Text style={styles.continueText}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    continueBtn: {
        backgroundColor: '#1E293B',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 10,
        alignItems: 'center',
    },
    continueText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
});