import React, { useState, useMemo, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Modal,
    TouchableWithoutFeedback,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { loadPlanCards, loadRouteCards } from '../../api/integration/newui-gateway';
import ExpandableCard from '../../components/ExpandableCard';
import SearchBarHeader from '../../components/SearchBarHeader';

// =====================================================================
// TYPES & DATA MODELS
// =====================================================================
export type SortOption = 'name' | 'nearest' | 'creation date';
export type SubTabType = 'PLAN' | 'ROUTE';

export interface PlanItem {
    id: string;
    title: string;
    isOwnedByYou: boolean;
    details?: string;
    startDate: string; // Định dạng ISO: YYYY-MM-DD
    createdAt: string; // Định dạng ISO: YYYY-MM-DD
}

export default function PlanScreen() {
    // -----------------------------------------------------------------
    // STATES MANAGEMENT
    // -----------------------------------------------------------------
    const [plans, setPlans] = useState<PlanItem[]>([]);
    const [routes, setRoutes] = useState<PlanItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [loadError, setLoadError] = useState('');
    const refresh = useCallback(async () => {
        setIsLoading(true);
        setLoadError('');
        const [planResult, routeResult] = await Promise.allSettled([loadPlanCards(), loadRouteCards()]);
        setPlans(planResult.status === 'fulfilled' ? planResult.value : []);
        setRoutes(routeResult.status === 'fulfilled' ? routeResult.value : []);
        const errors: string[] = [];
        if (planResult.status === 'rejected') {
            errors.push(`Plan: ${planResult.reason instanceof Error ? planResult.reason.message : String(planResult.reason)}`);
        }
        if (routeResult.status === 'rejected') {
            errors.push(`Route: ${routeResult.reason instanceof Error ? routeResult.reason.message : String(routeResult.reason)}`);
        }
        setLoadError(errors.join(' | '));
        setIsLoading(false);
    }, []);
    useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

    // Search States
    const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Navigation & Sort States
    const [subTab, setSubTab] = useState<SubTabType>('PLAN');
    const [planSortBy, setPlanSortBy] = useState<SortOption>('name');
    const [routeSortBy, setRouteSortBy] = useState<SortOption>('name');
    const [isMenuVisible, setIsMenuVisible] = useState<boolean>(false);

    // Lấy SortOption & List tương ứng theo SubTab đang active
    const currentSortBy = subTab === 'PLAN' ? planSortBy : routeSortBy;
    const rawList = subTab === 'PLAN' ? plans : routes;

    // -----------------------------------------------------------------
    // COMPUTED & SEARCH + SORTING LOGIC
    // -----------------------------------------------------------------
    const filteredAndSortedList = useMemo(() => {
        if (!rawList || rawList.length === 0) return [];
        let listCopy = [...rawList];

        // Lọc theo từ khóa tìm kiếm (tiêu đề hoặc chi tiết)
        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            listCopy = listCopy.filter(
                (item) =>
                    item.title.toLowerCase().includes(query) ||
                    (item.details && item.details.toLowerCase().includes(query))
            );
        }

        // Sắp xếp danh sách
        switch (currentSortBy) {
            case 'name':
                return listCopy.sort((a, b) => a.title.localeCompare(b.title));
            case 'nearest':
                return listCopy.sort(
                    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                );
            case 'creation date':
                return listCopy.sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
            default:
                return listCopy;
        }
    }, [rawList, currentSortBy, searchQuery]);

    const isEmpty = filteredAndSortedList.length === 0;

    const handleSelectSort = (option: SortOption) => {
        if (subTab === 'PLAN') {
            setPlanSortBy(option);
        } else {
            setRouteSortBy(option);
        }
        setIsMenuVisible(false);
    };

    const handleCancelSearch = () => {
        setSearchQuery('');
        setIsSearchActive(false);
    };

    // -----------------------------------------------------------------
    // CHUYỂN HƯỚNG TỚI TRANG QUẢN LÝ
    // -----------------------------------------------------------------
    const handleItemPress = (item: PlanItem) => {
        if (subTab === 'PLAN') {
            router.push({
                pathname: '/manage-plan',
                params: { id: item.id },
            });
        } else {
            router.push({
                pathname: '/manage-route',
                params: { id: item.id },
            });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* --- HEADER TƯƠNG TÁC DÙNG CHUNG SEARCHBARHEADER --- */}
                <SearchBarHeader
                    title="PLAN"
                    placeholder={`Search ${subTab.toLowerCase()} by title, details...`}
                    isSearching={isSearchActive}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    onStartSearch={() => setIsSearchActive(true)}
                    onCancelSearch={handleCancelSearch}
                />

                {/* --- ACTION CARDS --- */}
                <View style={styles.actionCardsRow}>
                    <TouchableOpacity
                        style={[styles.actionCard, styles.createPlanCard]}
                        activeOpacity={0.85}
                        onPress={() => router.push('/makeaplan')}
                    >
                        <Text style={styles.createPlanText}>Create a new plan</Text>
                        <View style={styles.cardIconBottomRight}>
                            <Octicons name="bookmark" size={18} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, styles.createRouteCard]}
                        activeOpacity={0.85}
                        onPress={() => router.push('/makearoute')}
                    >
                        <Text style={styles.createRouteText}>Create a new route</Text>
                        <View style={styles.cardIconBottomRight}>
                            <Octicons name="git-branch" size={18} color="#0F172A" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* --- SUB TAB SWITCHER --- */}
                <View style={styles.tabToggleRow}>
                    <TouchableOpacity
                        style={[styles.tabBtn, subTab === 'PLAN' ? styles.tabBtnActive : styles.tabBtnInactive]}
                        activeOpacity={0.8}
                        onPress={() => setSubTab('PLAN')}
                    >
                        <Octicons name="bookmark" size={14} color={subTab === 'PLAN' ? '#FFFFFF' : '#0F172A'} />
                        <Text style={[styles.tabBtnText, subTab === 'PLAN' ? styles.tabTextActive : styles.tabTextInactive]}>
                            PLAN
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabBtn, subTab === 'ROUTE' ? styles.tabBtnActive : styles.tabBtnInactive]}
                        activeOpacity={0.8}
                        onPress={() => setSubTab('ROUTE')}
                    >
                        <Octicons name="git-branch" size={14} color={subTab === 'ROUTE' ? '#FFFFFF' : '#0F172A'} />
                        <Text style={[styles.tabBtnText, subTab === 'ROUTE' ? styles.tabTextActive : styles.tabTextInactive]}>
                            ROUTE
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.dashedLine} />
                {loadError ? <Text style={{ color: '#B91C1C', marginHorizontal: 24, marginBottom: 12 }} onPress={() => { void refresh(); }}>{loadError} (tap to retry)</Text> : null}

                {/* --- FILTER BAR --- */}
                {!isEmpty && (
                    <View style={styles.filterBarRow}>
                        <Text style={styles.listCountText}>
                            {filteredAndSortedList.length} {subTab.toLowerCase()}(s)
                        </Text>

                        <TouchableOpacity
                            style={styles.filterBtn}
                            activeOpacity={0.7}
                            onPress={() => setIsMenuVisible(true)}
                        >
                            <Octicons name="sort-desc" size={20} color="#0F172A" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* --- MAIN CONTENT AREA --- */}
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#0284C7" />
                    </View>
                ) : isEmpty ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.sadIconCircle}>
                            <Octicons
                                name={searchQuery.trim() ? 'search' : 'smiley'}
                                size={40}
                                color="#94A3B8"
                            />
                        </View>
                        <Text style={styles.emptyTitle}>
                            {searchQuery.trim()
                                ? `No ${subTab.toLowerCase()} found`
                                : subTab === 'PLAN'
                                    ? 'You currently have no plans !'
                                    : 'You currently have no route !'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {searchQuery.trim()
                                ? `No results matching "${searchQuery}". Try different keywords.`
                                : subTab === 'PLAN'
                                    ? 'Create a new plan or explore existing plans from the community'
                                    : 'Create a new route or explore existing route from the community'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.listContainer}>
                        {filteredAndSortedList.map((item) => (
                            <ExpandableCard
                                key={item.id}
                                id={item.id}
                                title={item.title}
                                iconName={subTab === 'PLAN' ? 'bookmark' : 'git-branch'}
                                isOwnedByYou={item.isOwnedByYou}
                                headerColor={subTab === 'PLAN' ? '#bee8ff' : '#f6eab2'}
                                defaultExpanded={false}
                                onTitlePress={() => handleItemPress(item)}
                            >
                                <View style={styles.cardContentWrapper}>
                                    {item.details ? (
                                        <Text style={styles.cardDetailText}>{item.details}</Text>
                                    ) : null}

                                    <View style={styles.cardMetaRow}>
                                        <Text style={styles.cardMetaText}>📅 Khởi hành: {item.startDate}</Text>
                                        <Text style={styles.cardMetaText}>🕒 Tạo lúc: {item.createdAt}</Text>
                                    </View>

                                    {/* Nút chuyển tới trang quản lý tương ứng */}
                                    <TouchableOpacity
                                        style={styles.manageBtn}
                                        activeOpacity={0.8}
                                        onPress={() => handleItemPress(item)}
                                    >
                                        <Text style={styles.manageBtnText}>
                                            {subTab === 'PLAN' ? 'Manage plan' : 'Manage route'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </ExpandableCard>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* --- DROPDOWN SORT MENU MODAL --- */}
            <Modal
                visible={isMenuVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsMenuVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsMenuVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.dropdownMenuContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.menuOptionBtn,
                                    styles.menuOptionTop,
                                    currentSortBy === 'name' && styles.menuOptionSelected,
                                ]}
                                activeOpacity={0.8}
                                onPress={() => handleSelectSort('name')}
                            >
                                <Text style={[styles.menuOptionText, currentSortBy === 'name' && styles.menuOptionTextSelected]}>
                                    name
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.menuOptionBtn,
                                    styles.menuOptionMiddle,
                                    currentSortBy === 'nearest' && styles.menuOptionSelected,
                                ]}
                                activeOpacity={0.8}
                                onPress={() => handleSelectSort('nearest')}
                            >
                                <Text style={[styles.menuOptionText, currentSortBy === 'nearest' && styles.menuOptionTextSelected]}>
                                    nearest
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.menuOptionBtn,
                                    styles.menuOptionBottom,
                                    currentSortBy === 'creation date' && styles.menuOptionSelected,
                                ]}
                                activeOpacity={0.8}
                                onPress={() => handleSelectSort('creation date')}
                            >
                                <Text style={[styles.menuOptionText, currentSortBy === 'creation date' && styles.menuOptionTextSelected]}>
                                    creation date
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 110,
    },
    actionCardsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    actionCard: {
        flex: 1,
        height: 90,
        borderRadius: 16,
        padding: 14,
        justifyContent: 'space-between',
        position: 'relative',
    },
    createPlanCard: {
        backgroundColor: '#50C1FF',
    },
    createRouteCard: {
        backgroundColor: '#F1F5F9',
    },
    createPlanText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#FFFFFF',
        width: '80%',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    createRouteText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#0F172A',
        width: '80%',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    cardIconBottomRight: {
        position: 'absolute',
        bottom: 12,
        right: 12,
    },
    tabToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    tabBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 9999,
        gap: 8,
    },
    tabBtnActive: {
        backgroundColor: '#334155',
    },
    tabBtnInactive: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    tabBtnText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    tabTextActive: {
        color: '#FFFFFF',
    },
    tabTextInactive: {
        color: '#0F172A',
    },
    dashedLine: {
        borderBottomWidth: 1,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        width: '100%',
        marginBottom: 16,
    },
    filterBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    listCountText: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 13,
        color: '#64748B',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    filterBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        marginTop: 4,
    },
    cardContentWrapper: {
        gap: 10,
        paddingTop: 4,
    },
    cardDetailText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 14,
        color: '#334155',
        lineHeight: 20,
        includeFontPadding: false,
    },
    cardMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    cardMetaText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 12,
        color: '#64748B',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    manageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1E293B',
        paddingVertical: 10,
        borderRadius: 10,
        marginTop: 8,
        gap: 8,
    },
    manageBtnText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    loadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 24,
    },
    sadIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 18,
        color: '#334155',
        textAlign: 'center',
        marginBottom: 8,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    emptySubtitle: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 20,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 245,
        paddingRight: 24,
    },
    dropdownMenuContainer: {
        width: 170,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 4,
    },
    menuOptionBtn: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    menuOptionTop: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    menuOptionMiddle: {
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#F1F5F9',
    },
    menuOptionBottom: {
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },
    menuOptionSelected: {
        backgroundColor: '#F8FAFC',
    },
    menuOptionText: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 14,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    menuOptionTextSelected: {
        fontFamily: 'GoogleSans-Bold',
        color: '#0284C7',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
});