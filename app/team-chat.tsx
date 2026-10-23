import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    FlatList,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Modal,
    TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

export interface PlanOption {
    id: string;
    title: string;
    startDate: string;
    location: string;
    isOwnedByYou: boolean;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text?: string;
    linkedPlan?: PlanOption;
    timestamp: string;
    isSelf: boolean;
}

const AVAILABLE_PLANS: PlanOption[] = [
    {
        id: 'p1',
        title: 'Plan A: Da Lat 3D2N Expedition',
        startDate: 'Nov 15, 2026',
        location: 'Da Lat, Lam Dong',
        isOwnedByYou: true,
    },
    {
        id: 'p2',
        title: 'Plan B: Tri An Lake Weekend Camping',
        startDate: 'Oct 25, 2026',
        location: 'Dinh Quan, Dong Nai',
        isOwnedByYou: true,
    },
    {
        id: 'p3',
        title: 'Plan C: Fansipan Peak Conquer',
        startDate: 'Dec 05, 2026',
        location: 'Sa Pa, Lao Cai',
        isOwnedByYou: false,
    },
];

const INITIAL_MESSAGES: ChatMessage[] = [
    {
        id: 'm1',
        senderId: 'u2',
        senderName: 'Alex',
        text: 'Hey everyone, have we decided which plan to follow for next month?',
        timestamp: '10:15 AM',
        isSelf: false,
    },
    {
        id: 'm2',
        senderId: 'u1',
        senderName: 'You',
        text: 'I have linked our tentative itinerary above. Take a look!',
        timestamp: '10:18 AM',
        isSelf: true,
    },
    {
        id: 'm3',
        senderId: 'u1',
        senderName: 'You',
        linkedPlan: AVAILABLE_PLANS[0],
        timestamp: '10:19 AM',
        isSelf: true,
    },
];

export default function TeamChatScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ teamId?: string; teamName?: string; isOwnedByYou?: string }>();

    const teamTitle = params.teamName || 'Team Discussion';

    const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
    const [inputText, setInputText] = useState('');
    const [activePlan, setActivePlan] = useState<PlanOption | null>(AVAILABLE_PLANS[0]);
    const [isPlanPickerVisible, setIsPlanPickerVisible] = useState(false);

    const flatListRef = useRef<FlatList>(null);

    const handleSendMessage = () => {
        const trimmed = inputText.trim();
        if (!trimmed) return;

        const newMsg: ChatMessage = {
            id: `msg_${Date.now()}`,
            senderId: 'u1',
            senderName: 'You',
            text: trimmed,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSelf: true,
        };

        setMessages((prev) => [...prev, newMsg]);
        setInputText('');

        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const handleSelectPlan = (plan: PlanOption) => {
        setActivePlan(plan);
        setIsPlanPickerVisible(false);

        const planMsg: ChatMessage = {
            id: `msg_plan_${Date.now()}`,
            senderId: 'u1',
            senderName: 'You',
            text: 'Updated team active itinerary:',
            linkedPlan: plan,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSelf: true,
        };

        setMessages((prev) => [...prev, planMsg]);

        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const renderMessageItem = ({ item }: { item: ChatMessage }) => {
        return (
            <View
                style={[
                    styles.messageBubbleWrapper,
                    item.isSelf ? styles.selfBubbleWrapper : styles.otherBubbleWrapper,
                ]}
            >
                {!item.isSelf && <Text style={styles.senderNameText}>{item.senderName}</Text>}

                {item.text ? (
                    <View
                        style={[
                            styles.bubbleBox,
                            item.isSelf ? styles.selfBubbleBox : styles.otherBubbleBox,
                        ]}
                    >
                        <Text
                            style={[
                                styles.messageContentText,
                                item.isSelf ? styles.selfMessageText : styles.otherMessageText,
                            ]}
                        >
                            {item.text}
                        </Text>
                    </View>
                ) : null}

                {/* Plan Card preview if attached */}
                {item.linkedPlan ? (
                    <TouchableOpacity
                        style={styles.attachedPlanCard}
                        activeOpacity={0.85}
                        onPress={() => {
                            router.push({
                                pathname: '/manage-plan',
                                params: { id: item.linkedPlan?.id },
                            });
                        }}
                    >
                        <View style={styles.attachedPlanHeader}>
                            <Octicons name="bookmark" size={15} color="#0284C7" />
                            <Text style={styles.attachedPlanTag}>Linked Plan</Text>
                        </View>
                        <Text style={styles.attachedPlanTitle} numberOfLines={1}>
                            {item.linkedPlan.title}
                        </Text>
                        <View style={styles.attachedPlanMeta}>
                            <Text style={styles.attachedPlanMetaText}>
                                📅 {item.linkedPlan.startDate}
                            </Text>
                            <Text style={styles.attachedPlanMetaText}>
                                📍 {item.linkedPlan.location}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ) : null}

                <Text style={styles.timestampText}>{item.timestamp}</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardContainer}
                keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
            >
                {/* --- HEADER --- */}
                <View style={styles.headerBar}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Octicons name="chevron-left" size={24} color="#0F172A" />
                    </TouchableOpacity>

                    <View style={styles.headerInfoCol}>
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            {teamTitle}
                        </Text>
                        <Text style={styles.headerSubTitle}>Active Team Chat</Text>
                    </View>

                    {/* Vùng đệm đối xứng sau khi bỏ nút bookmark */}
                    <View style={styles.placeholderRight} />
                </View>

                {/* --- ACTIVE PINNED PLAN BANNER --- */}
                {activePlan ? (
                    <View style={styles.pinnedPlanBanner}>
                        <View style={styles.pinnedPlanIcon}>
                            <Octicons name="paperclip" size={14} color="#0284C7" />
                        </View>
                        <View style={styles.pinnedPlanContent}>
                            <Text style={styles.pinnedPlanLabel}>Current Team Plan:</Text>
                            <Text style={styles.pinnedPlanName} numberOfLines={1}>
                                {activePlan.title} ({activePlan.startDate})
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.changePlanBtn}
                            activeOpacity={0.7}
                            onPress={() => setIsPlanPickerVisible(true)}
                        >
                            <Text style={styles.changePlanBtnText}>Change</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {/* --- CHAT MESSAGES LIST --- */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessageItem}
                    contentContainerStyle={styles.messagesListContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                />

                {/* --- BOTTOM INPUT BAR --- */}
                <View
                    style={[
                        styles.inputToolbar,
                        { paddingBottom: Math.max(insets.bottom, 12) },
                    ]}
                >
                    <TouchableOpacity
                        style={styles.attachPlanBtn}
                        activeOpacity={0.7}
                        onPress={() => setIsPlanPickerVisible(true)}
                    >
                        <Octicons name="plus-circle" size={22} color="#64748B" />
                    </TouchableOpacity>

                    <TextInput
                        style={styles.chatTextInput}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type your message..."
                        placeholderTextColor="#94A3B8"
                        multiline
                    />

                    <TouchableOpacity
                        style={[
                            styles.sendBtn,
                            inputText.trim().length > 0 && styles.sendBtnActive,
                        ]}
                        activeOpacity={0.8}
                        onPress={handleSendMessage}
                        disabled={inputText.trim().length === 0}
                    >
                        <Octicons
                            name="paper-airplane"
                            size={16}
                            color={inputText.trim().length > 0 ? '#FFFFFF' : '#94A3B8'}
                        />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* --- PLAN PICKER MODAL --- */}
            <Modal
                visible={isPlanPickerVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsPlanPickerVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={() => setIsPlanPickerVisible(false)}>
                        <View style={styles.modalDismissArea} />
                    </TouchableWithoutFeedback>

                    <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>Select Team Plan</Text>
                            <TouchableOpacity
                                onPress={() => setIsPlanPickerVisible(false)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Octicons name="x" size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalSubtitle}>
                            Select a travel itinerary to link with this group chat.
                        </Text>

                        <View style={styles.planOptionsList}>
                            {AVAILABLE_PLANS.map((plan) => {
                                const isCurrent = activePlan?.id === plan.id;
                                return (
                                    <TouchableOpacity
                                        key={plan.id}
                                        style={[
                                            styles.planOptionCard,
                                            isCurrent && styles.planOptionCardActive,
                                        ]}
                                        activeOpacity={0.8}
                                        onPress={() => handleSelectPlan(plan)}
                                    >
                                        <View style={styles.planOptionInfo}>
                                            <Text
                                                style={[
                                                    styles.planOptionTitle,
                                                    isCurrent && styles.planOptionTitleActive,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {plan.title}
                                            </Text>
                                            <Text style={styles.planOptionMeta}>
                                                📅 {plan.startDate} • 📍 {plan.location}
                                            </Text>
                                        </View>

                                        {isCurrent ? (
                                            <View style={styles.selectedCheckCircle}>
                                                <Octicons name="check" size={14} color="#FFFFFF" />
                                            </View>
                                        ) : (
                                            <Octicons name="chevron-right" size={16} color="#CBD5E1" />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    keyboardContainer: {
        flex: 1,
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 14,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderColor: '#E2E8F0',
    },
    backBtn: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerInfoCol: {
        flex: 1,
        marginLeft: 8,
    },
    headerTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 17,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    headerSubTitle: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 12,
        color: '#64748B',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    placeholderRight: {
        width: 36,
    },
    pinnedPlanBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderColor: '#BAE6FD',
        gap: 10,
    },
    pinnedPlanIcon: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pinnedPlanContent: {
        flex: 1,
    },
    pinnedPlanLabel: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 11,
        color: '#0369A1',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    pinnedPlanName: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 13,
        color: '#0C4A6E',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    changePlanBtn: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
    },
    changePlanBtnText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 12,
        color: '#0284C7',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    messagesListContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
        gap: 12,
        flexGrow: 1,
        justifyContent: 'flex-end',
    },
    messageBubbleWrapper: {
        maxWidth: '82%',
        gap: 4,
    },
    selfBubbleWrapper: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
    },
    otherBubbleWrapper: {
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
    },
    senderNameText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 11,
        color: '#64748B',
        marginLeft: 4,
        includeFontPadding: false,
    },
    bubbleBox: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
    },
    selfBubbleBox: {
        backgroundColor: '#1E293B',
        borderBottomRightRadius: 4,
    },
    otherBubbleBox: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderBottomLeftRadius: 4,
    },
    messageContentText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 14,
        lineHeight: 20,
        includeFontPadding: false,
    },
    selfMessageText: {
        color: '#FFFFFF',
    },
    otherMessageText: {
        color: '#0F172A',
    },
    timestampText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 10,
        color: '#94A3B8',
        marginHorizontal: 4,
        includeFontPadding: false,
    },
    attachedPlanCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#BAE6FD',
        padding: 12,
        gap: 6,
        width: 240,
    },
    attachedPlanHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    attachedPlanTag: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 11,
        color: '#0284C7',
        includeFontPadding: false,
    },
    attachedPlanTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#0F172A',
        includeFontPadding: false,
    },
    attachedPlanMeta: {
        gap: 2,
    },
    attachedPlanMetaText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 12,
        color: '#64748B',
        includeFontPadding: false,
    },
    inputToolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingTop: 10,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderColor: '#E2E8F0',
        gap: 10,
    },
    attachPlanBtn: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatTextInput: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontFamily: 'GoogleSans-Regular',
        fontSize: 14,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendBtnActive: {
        backgroundColor: '#1E293B',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'flex-end',
    },
    modalDismissArea: {
        flex: 1,
    },
    modalSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 22,
        paddingTop: 12,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#CBD5E1',
        alignSelf: 'center',
        marginBottom: 14,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    modalTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 18,
        color: '#0F172A',
        includeFontPadding: false,
    },
    modalSubtitle: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 13,
        color: '#64748B',
        marginBottom: 16,
        includeFontPadding: false,
    },
    planOptionsList: {
        gap: 10,
    },
    planOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 14,
        gap: 12,
    },
    planOptionCardActive: {
        backgroundColor: '#F0F9FF',
        borderColor: '#38BDF8',
    },
    planOptionInfo: {
        flex: 1,
        gap: 4,
    },
    planOptionTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#0F172A',
        includeFontPadding: false,
    },
    planOptionTitleActive: {
        color: '#0369A1',
    },
    planOptionMeta: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 12,
        color: '#64748B',
        includeFontPadding: false,
    },
    selectedCheckCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#0284C7',
        justifyContent: 'center',
        alignItems: 'center',
    },
});