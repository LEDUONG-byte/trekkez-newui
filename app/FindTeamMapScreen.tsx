import React, { useState, useRef, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Platform,
    Image,
    Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import AppText from '../components/AppText';
import PrimaryButton from '../components/PrimaryButton';

let Mapbox: any = null;
const MAPBOX_KEY = process.env.EXPO_PUBLIC_MAPBOX_KEY;

if (Platform.OS !== 'web') {
    Mapbox = require('@rnmapbox/maps').default;
    if (MAPBOX_KEY) {
        Mapbox.setAccessToken(MAPBOX_KEY);
    }
}

// =====================================================================
// MOCK DATA: Active recruiting teams
// =====================================================================
const ACTIVE_TEAMS = [
    {
        id: 'team_01',
        planName: 'Ta Nang - Phan Dung Trekking',
        teamName: 'Sixseven Team',
        difficulty: 'EASY',
        membersCount: 4,
        maxMembers: 8,
        startDate: 'Nov 15, 2026',
        startCoordinate: [106.6882, 10.8225],
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    },
    {
        id: 'team_02',
        planName: 'Langbiang Peak Conquest',
        teamName: 'Da Lat Hikers',
        difficulty: 'MODERATE',
        membersCount: 2,
        maxMembers: 5,
        startDate: 'Dec 20, 2026',
        startCoordinate: [106.6950, 10.8280],
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    },
    {
        id: 'team_03',
        planName: 'Tri An Lake Camping',
        teamName: 'Chill & Camp',
        difficulty: 'EASY',
        membersCount: 6,
        maxMembers: 10,
        startDate: 'Jan 05, 2027',
        startCoordinate: [106.6800, 10.8150],
        avatarUrl: null,
    },
];

export default function FindTeamMapScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const cameraRef = useRef<any>(null);

    const [selectedTeam, setSelectedTeam] = useState<typeof ACTIVE_TEAMS[0] | null>(null);
    const [imageLoadedMap, setImageLoadedMap] = useState<Record<string, boolean>>({});

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

    const handleSelectTeam = (team: typeof ACTIVE_TEAMS[0]) => {
        setSelectedTeam(team);

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

    const handleJoinRequest = () => {
        Alert.alert('Success', `Join request sent to ${selectedTeam?.teamName}!`);
        setSelectedTeam(null);
    };

    const handleSearchPress = () => {
        // Xử lý tìm kiếm hoặc mở danh sách bộ lọc
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
                        centerCoordinate={[106.6882, 10.8225]}
                        animationMode="flyTo"
                        animationDuration={1500}
                    />

                    <Mapbox.UserLocation visible={true} />

                    {/* Team Markers */}
                    {ACTIVE_TEAMS.map((team) => {
                        const isSelected = selectedTeam?.id === team.id;
                        const isLoaded = !!imageLoadedMap[team.id];

                        return (
                            <Mapbox.PointAnnotation
                                key={`${team.id}-${isSelected ? 'active' : 'idle'}-${isLoaded ? 'loaded' : 'raw'}`}
                                id={`marker_${team.id}`}
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
                                title="Request to Join"
                                onPress={handleJoinRequest}
                            />
                        </View>
                    </View>
                )}
            </SafeAreaView>
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