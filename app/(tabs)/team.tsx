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
import { loadTeamCards } from '../../api/integration/newui-gateway';
import { requestTeamJoin } from '../../api/services/team/team-join-request';
import ExpandableCard from '../../components/ExpandableCard';
import SearchBarHeader from '../../components/SearchBarHeader';

// =====================================================================
// TYPES & DATA MODELS
// =====================================================================
export type TeamSortOption = 'name' | 'members' | 'creation date';

export interface TeamItem {
    id: string;
    name: string;
    imageUrl?: string;
    isOwnedByYou: boolean;
    isJoined?: boolean;
    allowMatchmaking?: boolean;
    membersCount: number;
    description?: string;
    createdAt: string; // ISO format: YYYY-MM-DD
}

const TEAM_COLORS = {
    OWNED: '#BAE6FD',
    OTHER: '#FEF08A',
};

export default function TeamScreen() {
    // -----------------------------------------------------------------
    // STATES MANAGEMENT
    // -----------------------------------------------------------------
    const [teams, setTeams] = useState<TeamItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [loadError, setLoadError] = useState('');
    const refreshTeams = useCallback(async () => {
        setIsLoading(true);
        setLoadError('');
        try {
            setTeams(await loadTeamCards());
        } catch (error) {
            setTeams([]);
            setLoadError(error instanceof Error ? error.message : String(error));
        } finally {
            setIsLoading(false);
        }
    }, []);
    useFocusEffect(useCallback(() => { void refreshTeams(); }, [refreshTeams]));

    // Search States
    const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Sort States
    const [sortBy, setSortBy] = useState<TeamSortOption>('name');
    const [isMenuVisible, setIsMenuVisible] = useState<boolean>(false);

    // -----------------------------------------------------------------
    // COMPUTED & FILTERING / SORTING LOGIC
    // -----------------------------------------------------------------
    const filteredAndSortedTeams = useMemo(() => {
        if (!teams || teams.length === 0) return [];

        let list = [...teams];

        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            list = list.filter(
                (item) =>
                    item.name.toLowerCase().includes(query) ||
                    (item.description && item.description.toLowerCase().includes(query))
            );
        }

        switch (sortBy) {
            case 'name':
                return list.sort((a, b) => a.name.localeCompare(b.name));
            case 'members':
                return list.sort((a, b) => b.membersCount - a.membersCount);
            case 'creation date':
                return list.sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
            default:
                return list;
        }
    }, [teams, sortBy, searchQuery]);

    const isEmpty = filteredAndSortedTeams.length === 0;

    const handleSelectSort = (option: TeamSortOption) => {
        setSortBy(option);
        setIsMenuVisible(false);
    };

    const handleOpenFindTeamMap = () => {
        router.push('/FindTeamMapScreen');
    };

    const handleCreateTeam = () => {
        router.push('/create-team');
    };

    const handleCancelSearch = () => {
        setSearchQuery('');
        setIsSearchActive(false);
    };

    const handleNavigateManage = (teamId: string) => {
        router.push({
            pathname: '/manage-team',
            params: { id: teamId },
        });
    };

    const handleOpenTeamChat = (team: TeamItem) => {
        router.push({
            pathname: '/team-chat',
            params: {
                teamId: team.id,
                teamName: team.name,
                isOwnedByYou: String(team.isOwnedByYou),
            },
        });
    };

    const handleRequestJoin = async (team: TeamItem) => {
        try {
            await requestTeamJoin(team.id);
            await refreshTeams();
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : String(error));
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* --- SHARED INTERACTIVE SEARCH HEADER --- */}
                <SearchBarHeader
                    title="TEAM"
                    placeholder="Search teams by name, description..."
                    isSearching={isSearchActive}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    onStartSearch={() => setIsSearchActive(true)}
                    onCancelSearch={handleCancelSearch}
                />

                {/* --- ACTION CARDS --- */}
                <View style={styles.actionCardsRow}>
                    <TouchableOpacity
                        style={[styles.actionCard, styles.findTeamCard]}
                        activeOpacity={0.85}
                        onPress={handleOpenFindTeamMap}
                    >
                        <Text style={styles.findTeamText}>Find a team</Text>
                        <View style={styles.cardIconBottomRight}>
                            <Octicons name="people" size={18} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, styles.createTeamCard]}
                        activeOpacity={0.85}
                        onPress={handleCreateTeam}
                    >
                        <Text style={styles.createTeamText}>Create a new team</Text>
                        <View style={styles.cardIconBottomRight}>
                            <Octicons name="people" size={18} color="#0F172A" />
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.dashedLine} />
                {loadError ? <Text style={{ color: '#B91C1C', marginHorizontal: 24, marginBottom: 12 }} onPress={() => { void refreshTeams(); }}>{loadError} (tap to retry)</Text> : null}

                {/* --- LEGEND & SORT BAR --- */}
                {!isEmpty && (
                    <View style={styles.legendAndFilterRow}>
                        <View style={styles.legendContainer}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendColorBox, { backgroundColor: TEAM_COLORS.OWNED }]} />
                                <Text style={styles.legendText}>owned by you</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendColorBox, { backgroundColor: TEAM_COLORS.OTHER }]} />
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
                            {searchQuery.trim() ? 'No teams found' : 'You currently have no teams!'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {searchQuery.trim()
                                ? `No results matching "${searchQuery}". Try different keywords.`
                                : 'Create a new team or explore existing teams from the community.'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.listContainer}>
                        {filteredAndSortedTeams.map((team) => {
                            const headerColor = team.isOwnedByYou
                                ? TEAM_COLORS.OWNED
                                : TEAM_COLORS.OTHER;

                            return (
                                <ExpandableCard
                                    key={team.id}
                                    id={team.id}
                                    title={team.name}
                                    imageUrl={team.imageUrl}
                                    isOwnedByYou={team.isOwnedByYou}
                                    headerColor={headerColor}
                                    defaultExpanded={false}
                                    onHeaderPress={() => handleOpenTeamChat(team)}
                                >
                                    <View style={styles.cardContentWrapper}>
                                        <Text style={styles.cardDetailText}>
                                            {team.description || 'No description provided.'}
                                        </Text>
                                        <View style={styles.cardMetaRow}>
                                            <Text style={styles.cardMetaText}>
                                                👥 Members: {team.membersCount}
                                            </Text>
                                            <Text style={styles.cardMetaText}>
                                                🕒 Created: {team.createdAt}
                                            </Text>
                                        </View>

                                        {/* Action buttons row inside card */}
                                        <View style={styles.cardActionsRow}>
                                            <TouchableOpacity
                                                style={styles.chatActionBtn}
                                                activeOpacity={0.8}
                                                onPress={() => handleOpenTeamChat(team)}
                                            >
                                                <Octicons name="comment-discussion" size={14} color="#0F172A" />
                                                <Text style={styles.chatActionBtnText}>Group Chat</Text>
                                            </TouchableOpacity>

                                            {team.isOwnedByYou ? (
                                                <TouchableOpacity
                                                    style={styles.manageBtn}
                                                    activeOpacity={0.8}
                                                    onPress={() => handleNavigateManage(team.id)}
                                                >
                                                    <Text style={styles.manageBtnText}>Manage Team</Text>
                                                </TouchableOpacity>
                                            ) : team.isJoined ? (
                                                <View style={styles.memberStatusBadge}>
                                                    <Octicons name="check-circle" size={13} color="#059669" />
                                                    <Text style={styles.memberStatusText}>Joined as Member</Text>
                                                </View>
                                            ) : team.allowMatchmaking === false ? (
                                                <View style={styles.memberStatusBadge}>
                                                    <Octicons name="lock" size={13} color="#64748B" />
                                                    <Text style={styles.memberStatusText}>Invite only</Text>
                                                </View>
                                            ) : (
                                                <TouchableOpacity
                                                    style={styles.manageBtn}
                                                    activeOpacity={0.8}
                                                    onPress={() => { void handleRequestJoin(team); }}
                                                >
                                                    <Text style={styles.manageBtnText}>Request to Join</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                </ExpandableCard>
                            );
                        })}
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
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    createTeamText: {
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
        gap: 8,
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
        marginTop: 6,
    },
    cardMetaText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 12,
        color: '#64748B',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    cardActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 8,
    },
    chatActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
    },
    chatActionBtnText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    manageBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1E293B',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 8,
    },
    manageBtnText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    memberStatusBadge: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#ECFDF5',
        paddingVertical: 10,
        borderRadius: 10,
    },
    memberStatusText: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 12,
        color: '#059669',
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