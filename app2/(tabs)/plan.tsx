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
    color: string;
    details?: string;
    startDate: string; // Định dạng ISO: YYYY-MM-DD
    createdAt: string; // Định dạng ISO: YYYY-MM-DD
}

// =====================================================================
// MOCK DATA (Dễ dàng thay thế bằng dữ liệu từ Database / API)
// =====================================================================
const INITIAL_PLANS: PlanItem[] = [
    {
        id: 'p1',
        title: 'Plan A',
        isOwnedByYou: true,
        color: '#BAE6FD',
        details: 'Lịch trình du lịch Đà Lạt 3 ngày 2 đêm cùng bạn bè',
        startDate: '2026-11-15',
        createdAt: '2026-08-01',
    },
    {
        id: 'p2',
        title: 'Plan B',
        isOwnedByYou: true,
        color: '#BAE6FD',
        details: 'Chuyến cắm trại hồ Trị An',
        startDate: '2026-10-25',
        createdAt: '2026-09-10',
    },
    {
        id: 'p3',
        title: 'Plan C',
        isOwnedByYou: false,
        color: '#FEF08A',
        details: 'Phượt Tây Bắc ngắm lúa chín',
        startDate: '2026-12-01',
        createdAt: '2026-07-20',
    },
];

const INITIAL_ROUTES: PlanItem[] = [
    {
        id: 'r1',
        title: 'route A',
        isOwnedByYou: true,
        color: '#A7F3D0',
        details: 'Lộ trình đạp xe quanh Hồ Tây - 15km',
        startDate: '2026-10-22',
        createdAt: '2026-09-15',
    },
];

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
        try {
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
            if (errors.length) {
                console.warn('[TrekkEZ Plan] Partial load:', errors.join(' | '));
                setLoadError(errors.join(' | '));
            }
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : String(error));
        } finally { setIsLoading(false); }
    }, []);
    useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    // Navigation & Sort States
    const [subTab, setSubTab] = useState<SubTabType>('PLAN');
    const [planSortBy, setPlanSortBy] = useState<SortOption>('name');
    const [routeSortBy, setRouteSortBy] = useState<SortOption>('name');
    const [isMenuVisible, setIsMenuVisible] = useState<boolean>(false);

    // Lấy SortOption & List tương ứng theo SubTab đang active
    const currentSortBy = subTab === 'PLAN' ? planSortBy : routeSortBy;
    const rawList = subTab === 'PLAN' ? plans : routes;

    // -----------------------------------------------------------------
    // COMPUTED & SORTING LOGIC
    // -----------------------------------------------------------------
    const sortedList = useMemo(() => {
        if (!rawList || rawList.length === 0) return [];
        const listCopy = [...rawList];

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
    }, [rawList, currentSortBy]);

    // Tự động kiểm tra trạng thái rỗng từ dữ liệu thực tế
    const visibleItems = useMemo(() => {
        const query = searchQuery.trim().toLocaleLowerCase();
        return query ? sortedList.filter(item =>
            item.title.toLocaleLowerCase().includes(query) ||
            item.details?.toLocaleLowerCase().includes(query)
        ) : sortedList;
    }, [sortedList, searchQuery]);
    const isEmpty = visibleItems.length === 0;

    const handleSelectSort = (option: SortOption) => {
        if (subTab === 'PLAN') {
            setPlanSortBy(option);
        } else {
            setRouteSortBy(option);
        }
        setIsMenuVisible(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* --- HEADER BAR --- */}
                <SearchBarHeader
                    title="PLAN"
                    placeholder={subTab === 'PLAN' ? 'Search plans...' : 'Search routes...'}
                    isSearching={isSearchActive}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    onStartSearch={() => setIsSearchActive(true)}
                    onCancelSearch={() => { setIsSearchActive(false); setSearchQuery(''); }}
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

                {/* --- LEGEND & FILTER BAR --- */}
                {!isEmpty && (
                    <View style={styles.legendAndFilterRow}>
                        <View style={styles.legendContainer}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendColorBox, { backgroundColor: subTab === 'PLAN' ? '#BAE6FD' : '#A7F3D0' }]} />
                                <Text style={styles.legendText}>owned by you</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendColorBox, { backgroundColor: subTab === 'PLAN' ? '#FEF08A' : '#DDD6FE' }]} />
                                <Text style={styles.legendText}>owned by someone else</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.filterBtn}
                            activeOpacity={0.7}
                            onPress={() => setIsMenuVisible(true)}
                        >
                            <Octicons name="sort-desc" size={20} color="#0F172A" />
                        </TouchableOpacity>
                    </View>
                )}

                {loadError ? <Text style={{ color: '#B91C1C', marginVertical: 12 }} onPress={() => { void refresh(); }}>{loadError} (tap to retry)</Text> : null}
                {/* --- MAIN CONTENT AREA --- */}
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#0284C7" />
                    </View>
                ) : isEmpty ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.sadIconCircle}>
                            <Octicons name="smiley" size={48} color="#94A3B8" />
                        </View>
                        <Text style={styles.emptyTitle}>
                            {searchQuery.trim() ? 'No matching result found' : subTab === 'PLAN' ? 'You currently have no plans !' : 'You currently have no route !'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {subTab === 'PLAN'
                                ? 'Create a new plan or explore existing plans from the community'
                                : 'Create a new route or explore existing route from the community'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.listContainer}>
                        {visibleItems.map((item) => (
                            <ExpandableCard
                                key={item.id}
                                id={item.id}
                                title={item.title}
                                isOwnedByYou={item.isOwnedByYou}
                                headerColor={item.color}
                                defaultExpanded={false}
                                onHeaderPress={(id) => router.push({ pathname: subTab === 'PLAN' ? '/manage-plan' : '/manage-route', params: { id } })}
                            >
                                <View style={styles.cardContentWrapper}>
                                    {item.details ? <Text style={styles.cardDetailText}>{item.details}</Text> : null}
                                    <View style={styles.cardMetaRow}>
                                        <Text style={styles.cardMetaText}>📅 Khởi hành: {item.startDate || 'Chưa có ngày'}</Text>
                                        <Text style={styles.cardMetaText}>🕒 Tạo lúc: {item.createdAt || 'Chưa có ngày'}</Text>
                                    </View>
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
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
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
    legendAndFilterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    legendContainer: {
        gap: 4,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendColorBox: {
        width: 32,
        height: 10,
        borderRadius: 4,
    },
    legendText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 12,
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