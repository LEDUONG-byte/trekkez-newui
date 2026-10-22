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
    TextInput,
    Alert,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { loadTeamCards } from '../../api/integration/newui-gateway';
import ExpandableCard from '../../components/ExpandableCard';
import SearchFloat from '../../components/SearchFloat';
import { uploadTeam, getRemoteTeam } from '../../api/services/team/team-supabase';
import { requestTeamJoin } from '../../api/services/team/team-join-request';

// =====================================================================
// TYPES & DATA MODELS
// =====================================================================
export type TeamSortOption = 'name' | 'members' | 'creation date';

export interface TeamItem {
    id: string;
    name: string;
    isOwnedByYou: boolean;
    color: string;
    membersCount: number;
    description?: string;
    createdAt: string; // Định dạng ISO: YYYY-MM-DD
    isJoined?: boolean;
    allowMatchmaking?: boolean;
}

// =====================================================================
// MOCK DATA (Thay thế bằng API/Database)
// =====================================================================
const INITIAL_TEAMS: TeamItem[] = [];

export default function TeamScreen() {
    // -----------------------------------------------------------------
    // STATES MANAGEMENT
    // -----------------------------------------------------------------
    const [teams, setTeams] = useState<TeamItem[]>(INITIAL_TEAMS);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [loadError, setLoadError] = useState('');
    const refreshTeams = useCallback(async () => {
        setIsLoading(true);
        setLoadError('');
        try { setTeams(await loadTeamCards()); }
        catch (error) { setTeams([]); setLoadError(error instanceof Error ? error.message : String(error)); }
        finally { setIsLoading(false); }
    }, []);
    useFocusEffect(useCallback(() => { void refreshTeams(); }, [refreshTeams]));

    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [isCreateVisible, setIsCreateVisible] = useState(false);
    const [teamName, setTeamName] = useState('');
    const [teamDescription, setTeamDescription] = useState('');
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const notify = (message: string) => {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') window.alert(message);
        } else Alert.alert('TrekkEZ Team', message);
    };

    const createTeam = async () => {
        const name = teamName.trim();
        if (!name) { setFormError('Vui lòng nhập tên nhóm.'); return; }
        if (submitting) return;
        setFormError(''); setSubmitting(true);
        try {
            // UUIDv4, used only as a database entity identifier (not a credential).
            const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = Math.floor(Math.random() * 16);
                return (c === 'x' ? r : ((r & 0x3) | 0x8)).toString(16);
            });
            await uploadTeam({
                id, name, description: teamDescription.trim(),
                level: 'Tất cả cấp độ', location: '', routeName: '', tripDate: '',
                meetingPoint: '', note: '', imageUrl: '',
            });
            const confirmed = await getRemoteTeam(id);
            if (!confirmed) throw new Error('Đã gửi yêu cầu tạo nhóm nhưng chưa xác minh được nhóm đã lưu trên Supabase.');
            await refreshTeams();
            setTeamName(''); setTeamDescription(''); setIsCreateVisible(false);
            notify('Đã tạo nhóm và xác minh trên Supabase.');
        } catch (error) { setFormError(error instanceof Error ? error.message : String(error)); }
        finally { setSubmitting(false); }
    };

    const findableTeams = useMemo(() => teams.filter(
        team => !team.isOwnedByYou && !team.isJoined && team.allowMatchmaking !== false,
    ), [teams]);
    const requestJoin = async (team: TeamItem) => {
        setIsSearchVisible(false);
        try {
            await requestTeamJoin(team.id);
            notify(`Đã gửi yêu cầu tham gia nhóm ${team.name}. Chờ chủ nhóm duyệt.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setLoadError(message);
            notify(message);
        }
    };

    // Sort States
    const [sortBy, setSortBy] = useState<TeamSortOption>('name');
    const [isMenuVisible, setIsMenuVisible] = useState<boolean>(false);

    // -----------------------------------------------------------------
    // COMPUTED & SORTING LOGIC
    // -----------------------------------------------------------------
    const sortedTeams = useMemo(() => {
        if (!teams || teams.length === 0) return [];
        const listCopy = [...teams];

        switch (sortBy) {
            case 'name':
                return listCopy.sort((a, b) => a.name.localeCompare(b.name));
            case 'members':
                return listCopy.sort((a, b) => b.membersCount - a.membersCount);
            case 'creation date':
                return listCopy.sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
            default:
                return listCopy;
        }
    }, [teams, sortBy]);

    const isEmpty = sortedTeams.length === 0;

    const handleSelectSort = (option: TeamSortOption) => {
        setSortBy(option);
        setIsMenuVisible(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* --- HEADER BAR --- */}
                <View style={styles.headerBar}>
                    <Text style={styles.headerTitle}>TEAM</Text>
                    <View style={styles.headerRightBtns}>
                        <TouchableOpacity style={styles.circleHeaderBtn} activeOpacity={0.7}
                            onPress={() => setIsSearchVisible(true)}>
                            <Octicons name="search" size={18} color="#0F172A" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* --- ACTION CARDS --- */}
                <View style={styles.actionCardsRow}>
                    <TouchableOpacity
                        style={[styles.actionCard, styles.findTeamCard]}
                        activeOpacity={0.85}
                        onPress={() => setIsSearchVisible(true)}
                    >
                        <Text style={styles.findTeamText}>Find a team</Text>
                        <View style={styles.cardIconBottomRight}>
                            <Octicons name="people" size={18} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, styles.createTeamCard]}
                        activeOpacity={0.85}
                        onPress={() => { setFormError(''); setIsCreateVisible(true); }}
                    >
                        <Text style={styles.createTeamText}>Create a new team</Text>
                        <View style={styles.cardIconBottomRight}>
                            <Octicons name="people" size={18} color="#0F172A" />
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.dashedLine} />

                {/* --- FILTER BAR --- */}
                <View style={styles.filterRow}>
                    <View style={styles.flex1} />
                    <TouchableOpacity
                        style={styles.filterBtn}
                        activeOpacity={0.7}
                        onPress={() => setIsMenuVisible(true)}
                    >
                        <Octicons name="sort-desc" size={20} color="#0F172A" />
                    </TouchableOpacity>
                </View>

                {loadError ? <Text style={{ color: '#B91C1C', marginVertical: 12 }} onPress={() => { void refreshTeams(); }}>{loadError} (tap to retry)</Text> : null}
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
                        <Text style={styles.emptyTitle}>You currently have no team!</Text>
                        <Text style={styles.emptySubtitle}>
                            Create a new team or explore existing teams from the community
                        </Text>
                    </View>
                ) : (
                    <View style={styles.listContainer}>
                        {sortedTeams.map((team) => (
                            <ExpandableCard
                                key={team.id}
                                id={team.id}
                                title={team.name}
                                isOwnedByYou={team.isOwnedByYou}
                                headerColor={team.color}
                                defaultExpanded={false}
                            >
                                <View style={styles.cardContentWrapper}>
                                    <Text style={styles.cardDetailText}>
                                        {team.description || 'Chưa có mô tả đội.'}
                                    </Text>
                                    <View style={styles.cardMetaRow}>
                                        <Text style={styles.cardMetaText}>
                                            👥 Thành viên: {team.membersCount}
                                        </Text>
                                        <Text style={styles.cardMetaText}>
                                            🕒 Tạo lúc: {team.createdAt}
                                        </Text>
                                    </View>
                                </View>
                            </ExpandableCard>
                        ))}
                    </View>
                )}
            </ScrollView>

            <SearchFloat<TeamItem>
                visible={isSearchVisible}
                data={findableTeams}
                searchFields={['name', 'description']}
                placeholder="Find a team"
                contentLayout="list"
                onClose={() => setIsSearchVisible(false)}
                renderItem={(team) => (
                    <TouchableOpacity key={team.id}
                        style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14 }}
                        onPress={() => { void requestJoin(team); }}>
                        <Text style={{ fontFamily: 'GoogleSans-Bold', color: '#0F172A' }}>{team.name}</Text>
                        <Text style={{ color: '#64748B', marginTop: 4 }} numberOfLines={2}>
                            {team.description || `${team.membersCount} thành viên`} · Tap to request join
                        </Text>
                    </TouchableOpacity>
                )}
                renderEmpty={() => <Text style={{ color: '#64748B', padding: 12 }}>Không tìm thấy nhóm có thể tham gia.</Text>}
            />

            <Modal transparent visible={isCreateVisible} animationType="fade"
                onRequestClose={() => setIsCreateVisible(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 24 }}>
                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, gap: 14 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontFamily: 'GoogleSans-Bold', fontSize: 20, color: '#0F172A' }}>Create a new team</Text>
                            <TouchableOpacity disabled={submitting} onPress={() => setIsCreateVisible(false)}>
                                <Octicons name="x" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <TextInput value={teamName} onChangeText={setTeamName} placeholder="Team name"
                            maxLength={100} style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, color: '#0F172A' }} />
                        <TextInput value={teamDescription} onChangeText={setTeamDescription} placeholder="Description (optional)"
                            multiline maxLength={500} style={{ minHeight: 72, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, textAlignVertical: 'top', color: '#0F172A' }} />
                        {formError ? <Text style={{ color: '#B91C1C' }} selectable>{formError}</Text> : null}
                        <TouchableOpacity disabled={submitting} onPress={() => { void createTeam(); }}
                            style={{ backgroundColor: '#50C1FF', padding: 14, borderRadius: 12, alignItems: 'center', opacity: submitting ? 0.5 : 1 }}>
                            <Text style={{ color: '#FFFFFF', fontFamily: 'GoogleSans-Bold' }}>
                                {submitting ? 'Saving...' : 'Create team'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

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
                                    sortBy === 'name' && styles.menuOptionSelected,
                                ]}
                                activeOpacity={0.8}
                                onPress={() => handleSelectSort('name')}
                            >
                                <Text
                                    style={[
                                        styles.menuOptionText,
                                        sortBy === 'name' && styles.menuOptionTextSelected,
                                    ]}
                                >
                                    name
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.menuOptionBtn,
                                    styles.menuOptionMiddle,
                                    sortBy === 'members' && styles.menuOptionSelected,
                                ]}
                                activeOpacity={0.8}
                                onPress={() => handleSelectSort('members')}
                            >
                                <Text
                                    style={[
                                        styles.menuOptionText,
                                        sortBy === 'members' && styles.menuOptionTextSelected,
                                    ]}
                                >
                                    members
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.menuOptionBtn,
                                    styles.menuOptionBottom,
                                    sortBy === 'creation date' && styles.menuOptionSelected,
                                ]}
                                activeOpacity={0.8}
                                onPress={() => handleSelectSort('creation date')}
                            >
                                <Text
                                    style={[
                                        styles.menuOptionText,
                                        sortBy === 'creation date' && styles.menuOptionTextSelected,
                                    ]}
                                >
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
    flex1: {
        flex: 1,
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
    findTeamCard: {
        backgroundColor: '#50C1FF',
    },
    createTeamCard: {
        backgroundColor: '#F1F5F9',
    },
    findTeamText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#FFFFFF',
        width: '80%',
    },
    createTeamText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#0F172A',
        width: '80%',
    },
    cardIconBottomRight: {
        position: 'absolute',
        bottom: 12,
        right: 12,
    },
    dashedLine: {
        borderBottomWidth: 1,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        width: '100%',
        marginBottom: 16,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: 16,
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
        gap: 8,
    },
    cardDetailText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 14,
        color: '#334155',
        lineHeight: 20,
    },
    cardMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    cardMetaText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 12,
        color: '#64748B',
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
    },
    emptySubtitle: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 200,
        paddingRight: 24,
    },
    dropdownMenuContainer: {
        width: 170,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
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
    },
    menuOptionTextSelected: {
        fontFamily: 'GoogleSans-Bold',
        color: '#0284C7',
    },
});