import React, { useEffect, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Animated // Thêm thư viện Animated
} from 'react-native';

interface CustomAlertProps {
    visible: boolean;
    title: string;
    content: string;
    buttonText?: string;
    onClose: () => void;
    icon?: React.ReactNode;
    iconText?: string;
    iconColor?: string;
    iconBackgroundColor?: string;
}

const { width, height } = Dimensions.get('window');

export default function CustomAlert({
                                        visible,
                                        title,
                                        content,
                                        buttonText = 'Xác nhận',
                                        onClose,
                                        icon,
                                        iconText = '!',
                                        iconColor = '#1E293B',
                                        iconBackgroundColor = '#CBD5E1',
                                    }: CustomAlertProps) {

    // Khởi tạo giá trị trượt ban đầu nằm ngoài màn hình (đẩy xuống dưới)
    const slideAnim = useRef(new Animated.Value(height)).current;

    useEffect(() => {
        if (visible) {
            // Khi mở: Bắt đầu từ dưới đáy
            slideAnim.setValue(height);
            // Trượt lên vị trí 0 với hiệu ứng lò xo mượt mà
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                damping: 25, // Độ cản (càng cao càng ít nảy)
                mass: 0.8, // Trọng lượng
                stiffness: 120, // Tốc độ và độ căng của lò xo
            }).start();
        }
    }, [visible, slideAnim]);

    // Hàm bọc lại sự kiện đóng để chạy hiệu ứng trượt xuống trước khi biến mất
    const handleClose = () => {
        Animated.timing(slideAnim, {
            toValue: height, // Trượt ngược lại xuống đáy
            duration: 250, // Thời gian trượt (ms)
            useNativeDriver: true,
        }).start(() => {
            onClose(); // Gọi hàm onClose của component cha sau khi trượt xong
        });
    };

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade" // Nền đen xuất hiện dạng fade (nhanh) thay vì slide
            onRequestClose={handleClose} // Xử lý khi ấn nút Back trên Android
        >
            {/* Chạm vào vùng đen để đóng thông báo */}
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={handleClose}
            >
                {/* Chặn sự kiện chạm lan xuống overlay khi chạm vào alertBox */}
                <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                    <Animated.View
                        style={[
                            styles.alertBox,
                            { transform: [{ translateY: slideAnim }] } // Gắn giá trị trượt
                        ]}
                    >

                        <View style={[styles.iconContainer, { backgroundColor: iconBackgroundColor }]}>
                            {icon ? (
                                icon
                            ) : (
                                <Text style={[styles.iconText, { color: iconColor }]}>
                                    {iconText}
                                </Text>
                            )}
                        </View>

                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.content}>{content}</Text>

                        <TouchableOpacity
                            style={styles.button}
                            activeOpacity={0.8}
                            onPress={handleClose} // Chạy hàm đóng có hoạt ảnh
                        >
                            <Text style={styles.buttonText}>{buttonText}</Text>
                        </TouchableOpacity>

                    </Animated.View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    alertBox: {
        backgroundColor: '#FFFFFF',
        width: width,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 40,
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 20,
    },
    title: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 18,
        color: '#0F172A',
        marginBottom: 12,
        textAlign: 'center',
    },
    content: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 14,
        color: '#64748B',
        marginBottom: 28,
        textAlign: 'center',
        lineHeight: 20,
    },
    button: {
        width: '100%',
        height: 56,
        backgroundColor: '#1E293B',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
});