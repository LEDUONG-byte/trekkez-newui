import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Platform,
    Image,
    Alert,
    ActivityIndicator,
    FlatList,
    Modal,
    TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import AppText from '../components/AppText';
import PrimaryButton from '../components/PrimaryButton';
import { loadFindableTeamPlans, type FindableTeamPlan } from '../api/integration/newui-gateway';
import { requestTeamJoin } from '../api/services/team/team-join-request';

let Mapbox: any = null;
const MAPBOX_KEY = process.env.EXPO_PUBLIC_MAPBOX_KEY;

if (Platform.OS !== 'web') {
    Mapbox = require('@rnmapbox/maps').default;
    if (MAPBOX_KEY) {
        Mapbox.setAccessToken(MAPBOX_KEY);
    }
}

export default function FindTeamMapScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const cameraRef = useRef<any>(null);

    const [teams, setTeams] = useState<FindableTeamPlan[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<FindableTeamPlan | null>(null);
    const [imageLoadedMap, setImageLoadedMap] = useState<Record<string, boolean>>({});
    const [isLoadingTeams, setIsLoadingTeams] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    const loadTeams = async () => {
        setIsLoadingTeams(true);
        setLoadError('');
        try {
            const results = await loadFindableTeamPlans();
            setTeams(results);
            if (results[0]) {
                cameraRef.current?.setCamera({
                    centerCoordinate: results[0].startCoordinate,
                    zoomLevel: 6,
                    animationDuration: 700,
                });
            }
        } catch (error) {
            setTeams([]);
            setLoadError(error instanceof Error ? error.message : String(error));
        } finally {
            setIsLoadingTeams(false);
        }
    };

    useEffect(() => {
        void loadTeams();
    }, []);

    const filteredTeams = useMemo(() => {
        const query = searchQuery.trim().toLocaleLowerCase();
        if (!query) return teams;
        return teams.filter((team) =>
            team.teamName.toLocaleLowerCase().includes(query) ||
            team.planName.toLocaleLowerCase().includes(query) ||
            team.difficulty.toLocaleLowerCase().includes(query),
        );
    }, [teams, searchQuery]);

    // Scale Bar states
    const [currentZoom, setCurrentZoom] = useState<number>(13);
    const [centerLat, setCenterLat] = useState<number>(10.8225);

    // -----------------------------------------------------------------
    // TÍNH TOÁN THANH TỶ LỆ CHỮ L THEO ZOOM & VĨ ĐỘ (GIỐNG MAKE A ROUTE)
    // -----------------------------------------------------------------
    const scaleBarData = useMemo(() => {
        const metersPerDp =
            (40075016.686 * Math.cos((centerLat * Math.PI) / 180)) /
            (512 * Math.pow(2, currentZoom));

        const niceSteps = [
            5, 10, 20, 25, 50, 100, 200, 250, 500,
            1000, 2000, 2500, 5000, 10000, 20000, 50000,
        ];
        const maxWidth = 80;
        let chosenStep = 50;
        let chosenWidth = 60;

        for (const s of niceSteps) {
            const w = s / metersPerDp;
            if (w <= maxWidth) {
                chosenStep = s;
                chosenWidth = w;
            } else {
                break;
            }
        }

        const isKm = chosenStep >= 1000;
        const displayValue = isKm ? chosenStep / 1000 : chosenStep;
        const formattedText =
            isKm && displayValue % 1 !== 0
                ? displayValue.toFixed(1)
                : `${displayValue}`;

        return {
            width: Math.max(40, Math.round(chosenWidth)),
            text: `${formattedText} ${isKm ? 'km' : 'm'}`,
        };
    }, [currentZoom, centerLat]);

    const handleCameraChanged = (state: any) => {
        const zoom = state?.properties?.zoom ?? state?.properties?.zoomLevel;
        const center = state?.properties?.center;
        if (typeof zoom === 'number') {
            setCurrentZoom(zoom);
        }
        if (Array.isArray(center) && center.length === 2) {
            setCenterLat(center[1]);
        }
    };

    const handleSelectTeam = (team: FindableTeamPlan) => {
        setSelectedTeam(team);
        setIsSearchVisible(false);

        if (cameraRef.current) {
            cameraRef.current.setCamera({
                centerCoordinate: team.startCoordinate,
                zoomLevel: 14.5,
                animationDuration: 600,
                animationMode: 'flyTo',
            });
        }
    };

    const handleDeselectMap = () => {
        setSelectedTeam(null);
    };

    const handleJoinRequest = async () => {
        if (!selectedTeam || isJoining || selectedTeam.isJoined || selectedTeam.isOwnedByYou) return;
        setIsJoining(true);
        try {
            await requestTeamJoin(selectedTeam.teamId);
            Alert.alert('Request sent', `Your request to join ${selectedTeam.teamName} has been sent.`);
            setSelectedTeam(null);
        } catch (error) {
            Alert.alert('Could not request to join', error instanceof Error ? error.message : String(error));
        } finally {
            setIsJoining(false);
        }
    };

    const handleSearchPress = () => {
        setSearchQuery('');
        setIsSearchVisible(true);
    };

    return (
        <View style={styles.container}>
            {/* Mapbox Layer */}
            {Platform.OS !== 'web' && Mapbox ? (
                <Mapbox.MapView
                    style={StyleSheet.absoluteFill}
                    styleURL={Mapbox.StyleURL.Outdoors}
                    logoEnabled={false}
                    attributionEnabled={false}
                    compassEnabled={false}
                    scaleBarEnabled={false}
                    onPress={handleDeselectMap}
                    onCameraChanged={handleCameraChanged}
                    onRegionDidChange={handleCameraChanged}
                >
                    <Mapbox.Camera
                        ref={cameraRef}
                        zoomLevel={13}
                        centerCoordinate={teams[0]?.startCoordinate ?? [106.6882, 10.8225]}
                        animationMode="flyTo"
                        animationDuration={1500}
                    />

                    <Mapbox.UserLocation visible={true} />

                    {/* Team Markers */}
                    {teams.map((team) => {
                        const isSelected = selectedTeam?.id === team.id;
                        const isLoaded = !!imageLoadedMap[team.id];

                        return (
                            <Mapbox.PointAnnotation
                                key={`${team.id}-${team.planName}-${isSelected ? 'active' : 'idle'}-${isLoaded ? 'loaded' : 'raw'}`}
                                id={`marker_${team.teamId}_${team.id}`}
                                coordinate={team.startCoordinate}
                                onSelected={() => handleSelectTeam(team)}
                            >
                                <View style={styles.markerWrapper}>
                                    <View
                                        style={[
                                            styles.markerCircle,
                                            isSelected && styles.markerCircleSelected,
                                        ]}
                                    >
                                        {team.avatarUrl ? (
                                            <Image
                                                source={{ uri: team.avatarUrl }}
                                                style={styles.markerImage}
                                                resizeMode="cover"
                                                onLoadEnd={() => {
                                                    setImageLoadedMap((prev) => ({
                                                        ...prev,
                                                        [team.id]: true,
                                                    }));
                                                }}
                                            />
                                        ) : (
                                            <View
                                                style={[
                                                    styles.markerIconFallback,
                                                    isSelected && styles.markerIconFallbackSelected,
                                                ]}
                                            >
                                                <Octicons
                                                    name="people"
                                                    size={16}
                                                    color={isSelected ? '#FFFFFF' : '#0F172A'}
                                                />
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </Mapbox.PointAnnotation>
                        );
                    })}
                </Mapbox.MapView>
            ) : (
                <View style={[StyleSheet.absoluteFill, styles.webMapFallback]}>
                    <Octicons name="globe" size={48} color="#94A3B8" />
                    <AppText style={styles.webMapText}>Mapbox is not supported on Web</AppText>
                </View>
            )}

            {/* Overlay UI Controls */}
            <SafeAreaView style={styles.overlayContainer} pointerEvents="box-none">
                {/* Top Row: Back button, L-shaped scale bar & Search circular button */}
                <View style={styles.topRow} pointerEvents="box-none">
                    <View style={styles.topLeftCol} pointerEvents="box-none">
                        <TouchableOpacity
                            style={styles.circleBtn}
                            activeOpacity={0.8}
                            onPress={() => router.back()}
                        >
                            <Octicons name="chevron-left" size={24} color="#0F172A" />
                        </TouchableOpacity>

                        {/* THANH TỶ LỆ CHỮ L */}
                        <View style={styles.scaleLContainer} pointerEvents="none">
                            <Text style={[styles.scaleLText, { width: scaleBarData.width }]}>
                                {scaleBarData.text}
                            </Text>
                            <View
                                style={[
                                    styles.scaleLShapeRight,
                                    { width: scaleBarData.width },
                                ]}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.circleBtn}
                        activeOpacity={0.8}
                        onPress={handleSearchPress}
                    >
                        <Octicons name="search" size={20} color="#0F172A" />
                    </TouchableOpacity>
                </View>

                {isLoadingTeams ? (
                    <View style={styles.statusCard}>
                        <ActivityIndicator size="small" color="#0284C7" />
                        <AppText style={styles.statusText}>Loading teams with planned routes…</AppText>
                    </View>
                ) : loadError ? (
                    <TouchableOpacity style={styles.statusCard} onPress={() => { void loadTeams(); }}>
                        <Octicons name="sync" size={16} color="#B91C1C" />
                        <AppText style={styles.statusErrorText}>{loadError} · Tap to retry</AppText>
                    </TouchableOpacity>
                ) : teams.length === 0 ? (
                    <View style={styles.statusCard}>
                        <AppText style={styles.statusText}>No discoverable team plans with route locations yet.</AppText>
                    </View>
                ) : null}

                {/* Floating Bottom Card */}
                {selectedTeam && (
                    <View
                        style={[
                            styles.bottomCardWrapper,
                            { paddingBottom: Math.max(insets.bottom, 16) },
                        ]}
                        pointerEvents="box-none"
                    >
                        <View style={styles.floatingTeamCard}>
                            <View style={styles.teamInfoRow}>
                                {selectedTeam.avatarUrl ? (
                                    <Image
                                        source={{ uri: selectedTeam.avatarUrl }}
                                        style={styles.teamAvatar}
                                    />
                                ) : (
                                    <View style={styles.teamAvatarPlaceholder}>
                                        <AppText style={styles.avatarPlaceholderText}>
                                            {selectedTeam.teamName.charAt(0)}
                                        </AppText>
                                    </View>
                                )}

                                <View style={styles.teamTextContent}>
                                    <AppText style={styles.teamNameTitle} numberOfLines={1}>
                                        {selectedTeam.teamName}
                                    </AppText>
                                    <AppText style={styles.planNameText} numberOfLines={1}>
                                        Plan: {selectedTeam.planName}
                                    </AppText>
                                </View>

                                <TouchableOpacity
                                    style={styles.closeCardBtn}
                                    activeOpacity={0.7}
                                    onPress={handleDeselectMap}
                                >
                                    <Octicons name="x" size={18} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Octicons name="calendar" size={15} color="#64748B" />
                                    <AppText style={styles.statText}>
                                        Departure: {selectedTeam.startDate}
                                    </AppText>
                                </View>
                                <View style={styles.statItem}>
                                    <Octicons name="person" size={15} color="#64748B" />
                                    <AppText style={styles.statText}>
                                        {selectedTeam.membersCount}/{selectedTeam.maxMembers} members
                                    </AppText>
                                </View>
                            </View>

                            <PrimaryButton
                                title={isJoining ? 'Sending request...' : selectedTeam.isOwnedByYou ? 'Your Team' : selectedTeam.isJoined ? 'Already a member' : 'Request to Join'}
                                onPress={handleJoinRequest}
                                disabled={isJoining || selectedTeam.isJoined || selectedTeam.isOwnedByYou}
                            />
                        </View>
                    </View>
                )}
            </SafeAreaView>

            <Modal
                visible={isSearchVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setIsSearchVisible(false)}
            >
                <View style={styles.searchBackdrop}>
                    <View style={[styles.searchSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                        <View style={styles.searchHeader}>
                            <AppText style={styles.searchTitle}>Find a team</AppText>
                            <TouchableOpacity
                                style={styles.closeSearchButton}
                                onPress={() => setIsSearchVisible(false)}
                            >
                                <Octicons name="x" size={20} color="#334155" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchInputWrapper}>
                            <Octicons name="search" size={17} color="#64748B" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search team or plan"
                                placeholderTextColor="#94A3B8"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                                returnKeyType="search"
                            />
                            {searchQuery ? (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Octicons name="x-circle-fill" size={16} color="#94A3B8" />
                                </TouchableOpacity>
                            ) : null}
                        </View>
                        {isLoadingTeams ? (
                            <View style={styles.searchEmpty}>
                                <ActivityIndicator color="#0284C7" />
                                <AppText style={styles.searchEmptyText}>Loading teams...</AppText>
                            </View>
                        ) : loadError ? (
                            <View style={styles.searchEmpty}>
                                <AppText style={styles.searchErrorText}>{loadError}</AppText>
                                <TouchableOpacity onPress={() => { void loadTeams(); }}>
                                    <AppText style={styles.retryText}>Try again</AppText>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredTeams}
                                keyExtractor={(team) => team.id}
                                keyboardShouldPersistTaps="handled"
                                ListEmptyComponent={
                                    <View style={styles.searchEmpty}>
                                        <AppText style={styles.searchEmptyText}>
                                            {teams.length === 0
                                                ? 'No discoverable team plans with route locations yet.'
                                                : 'No teams match your search.'}
                                        </AppText>
                                    </View>
                                }
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.searchResult}
                                        activeOpacity={0.75}
                                        onPress={() => handleSelectTeam(item)}
                                    >
                                        {item.avatarUrl ? (
                                            <Image source={{ uri: item.avatarUrl }} style={styles.searchResultAvatar} />
                                        ) : (
                                            <View style={[styles.searchResultAvatar, styles.searchResultAvatarFallback]}>
                                                <Octicons name="people" size={17} color="#0369A1" />
                                            </View>
                                        )}
                                        <View style={styles.searchResultText}>
                                            <AppText style={styles.searchResultTeam} numberOfLines={1}>{item.teamName}</AppText>
                                            <AppText style={styles.searchResultPlan} numberOfLines={1}>{item.planName}</AppText>
                                            <AppText style={styles.searchResultMeta}>
                                                {item.membersCount}/{item.maxMembers} members · {item.startDate}
                                            </AppText>
                                        </View>
                                        <Octicons name="chevron-right" size={16} color="#94A3B8" />
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E2E8F0',
    },
    webMapFallback: {
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    webMapText: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 14,
        color: '#64748B',
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        gap: 10,
        maxWidth: '90%',
        marginTop: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
    },
    statusText: {
        color: '#475569',
        fontSize: 12,
        flexShrink: 1,
    },
    statusErrorText: {
        color: '#B91C1C',
        fontSize: 12,
        flexShrink: 1,
    },
    searchBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(15,23,42,0.35)',
    },
    searchSheet: {
        height: '78%',
        paddingHorizontal: 20,
        paddingTop: 18,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    searchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    searchTitle: {
        color: '#0F172A',
        fontFamily: 'GoogleSans-Bold',
        fontSize: 19,
    },
    closeSearchButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
    },
    searchInputWrapper: {
        height: 46,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        marginBottom: 12,
        borderRadius: 14,
        backgroundColor: '#F1F5F9',
    },
    searchInput: {
        flex: 1,
        paddingVertical: 0,
        color: '#0F172A',
        fontSize: 14,
    },
    searchEmpty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingHorizontal: 18,
    },
    searchEmptyText: {
        color: '#64748B',
        fontSize: 13,
        textAlign: 'center',
    },
    searchErrorText: {
        color: '#B91C1C',
        fontSize: 13,
        textAlign: 'center',
    },
    retryText: {
        color: '#0284C7',
        fontSize: 14,
        fontFamily: 'GoogleSans-Bold',
    },
    searchResult: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E2E8F0',
    },
    searchResultAvatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#E0F2FE',
    },
    searchResultAvatarFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchResultText: {
        flex: 1,
        gap: 3,
    },
    searchResultTeam: {
        color: '#0F172A',
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
    },
    searchResultPlan: {
        color: '#475569',
        fontFamily: 'GoogleSans-Medium',
        fontSize: 12,
    },
    searchResultMeta: {
        color: '#94A3B8',
        fontSize: 11,
    },

    // Marker Styles (Khắc phục hoàn toàn lỗi hình vuông và lỗi cache)
    markerWrapper: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    markerCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2.5,
        borderColor: '#FFFFFF',
        overflow: 'hidden',
    },
    markerCircleSelected: {
        width: 46,
        height: 46,
        borderRadius: 23,
        borderColor: '#207BFB',
        borderWidth: 3,
    },
    markerImage: {
        width: '100%',
        height: '100%',
        borderRadius: 9999,
    },
    markerIconFallback: {
        width: '100%',
        height: '100%',
        borderRadius: 9999,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    markerIconFallbackSelected: {
        backgroundColor: '#207BFB',
    },

    // Overlay Controls
    overlayContainer: {
        flex: 1,
        justifyContent: 'space-between',
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 12 : 4,
    },
    topLeftCol: {
        alignItems: 'flex-start',
    },
    circleBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Thanh tỷ lệ chữ L
    scaleLContainer: {
        marginTop: 8,
        alignItems: 'flex-end',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    scaleLText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 11,
        color: '#0F172A',
        marginBottom: 2,
        textAlign: 'right',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    scaleLShapeRight: {
        height: 8,
        borderBottomWidth: 2,
        borderRightWidth: 2,
        borderColor: '#0F172A',
        backgroundColor: 'transparent',
    },

    // Floating Bottom Card
    bottomCardWrapper: {
        paddingHorizontal: 16,
    },
    floatingTeamCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
        gap: 16,
    },
    teamInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    teamAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    teamAvatarPlaceholder: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#E0F2FE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarPlaceholderText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 22,
        color: '#0284C7',
    },
    teamTextContent: {
        flex: 1,
        gap: 4,
    },
    teamNameTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 17,
        color: '#0F172A',
    },
    planNameText: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 13,
        color: '#64748B',
    },
    closeCardBtn: {
        padding: 6,
        alignSelf: 'flex-start',
    },
    statsRow: {
        gap: 8,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    statText: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 13,
        color: '#334155',
    },
});