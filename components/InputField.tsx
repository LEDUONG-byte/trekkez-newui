import React from 'react';
import { StyleSheet, View, Text, TextInput, TextInputProps } from 'react-native';

interface InputFieldProps extends TextInputProps {
    label: string;
}

export default function InputField({
                                       label,
                                       style,
                                       value,
                                       placeholderTextColor = '#3B82F6',
                                       multiline,
                                       ...props
                                   }: InputFieldProps) {
    const hasValue = Boolean(value && value.length > 0);

    return (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TextInput
                style={[
                    styles.textInput,
                    hasValue ? styles.textInputBold : styles.textInputMedium,
                    multiline && styles.multilineInput,
                    style,
                ]}
                value={value}
                multiline={multiline}
                placeholderTextColor={placeholderTextColor}
                {...props}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    inputGroup: {
        alignItems: 'flex-start',
        width: '100%',
    },
    inputLabel: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#0F172A',
        textTransform: 'uppercase',
        includeFontPadding: false,
        padding: 0,
        margin: 0,
        marginBottom: 4,
    },
    textInput: {
        width: '100%',
        fontSize: 16,
        color: '#3B82F6',
        includeFontPadding: false,
        padding: 0,
        paddingHorizontal: 0,
        paddingVertical: 0,
        paddingLeft: 0,
        margin: 0,
        marginLeft: 0,
        textAlign: 'left',
    },
    multilineInput: {
        textAlignVertical: 'top',
    },
    textInputMedium: {
        fontFamily: 'GoogleSans-Medium',
    },
    textInputBold: {
        fontFamily: 'GoogleSans-Bold',
    },
});