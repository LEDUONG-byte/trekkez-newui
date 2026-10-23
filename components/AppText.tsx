import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

export default function AppText({ style, ...props }: TextProps) {
    return (
        <RNText
            {...props}
            style={[
                styles.defaultText,
                style,
            ]}
        />
    );
}

const styles = StyleSheet.create({
    defaultText: {
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
});