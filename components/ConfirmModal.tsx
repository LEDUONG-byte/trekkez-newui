import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback,
} from 'react-native';

export interface ConfirmModalProps {
    visible: boolean;
    title: string;
    content?: string;
    cancelText?: string;
    confirmText?: string;
    onCancel: () => void;
    onConfirm: () => void;
    destructive?: boolean;
}

export default function ConfirmModal({
                                         visible,
                                         title,
                                         content,
                                         cancelText = 'Cancel',
                                         confirmText = 'Confirm',
                                         onCancel,
                                         onConfirm,
                                         destructive = false,
                                     }: ConfirmModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <TouchableWithoutFeedback onPress={onCancel}>
                <View style={styles.backdrop}>
                    <TouchableWithoutFeedback>
                        <View style={styles.dialogContainer}>
                            {/* Tiêu đề & Nội dung */}
                            <View style={styles.textContainer}>
                                <Text style={styles.titleText}>{title}</Text>
                                {content ? (
                                    <Text style={styles.contentText}>{content}</Text>
                                ) : null}
                            </View>

                            {/* Hàng 2 nút hành động */}
                            <View style={styles.buttonRow}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    activeOpacity={0.8}
                                    onPress={onCancel}
                                >
                                    <Text style={styles.cancelBtnText}>{cancelText}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.confirmBtn,
                                        destructive && styles.confirmBtnDestructive,
                                    ]}
                                    activeOpacity={0.85}
                                    onPress={onConfirm}
                                >
                                    <Text style={styles.confirmBtnText}>{confirmText}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
    },
    dialogContainer: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 20,
        gap: 20,
    },
    textContainer: {
        alignItems: 'center',
        gap: 8,
    },
    titleText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#0F172A',
        textAlign: 'center',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    contentText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 18,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    buttonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        height: 48,
        backgroundColor: '#CFD8DC',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 14,
        color: '#475569',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    confirmBtn: {
        flex: 1,
        height: 48,
        backgroundColor: '#181A20',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmBtnDestructive: {
        backgroundColor: '#DC2626',
    },
    confirmBtnText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
});