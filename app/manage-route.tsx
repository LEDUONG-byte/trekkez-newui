import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
    Dimensions,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Mapbox from '@rnmapbox/maps';

const MAPBOX_KEY = process.env.EXPO_PUBLIC_MAPBOX_KEY;
if (MAPBOX_KEY) {
    Mapbox.setAccessToken(MAPBOX_KEY);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface RouteWaypoint {
    id: string;
    label: string;
    coordinate: [number, number]; // [lng, lat]
    name: string;
}

export interface RouteDetailData {
    id: string;
    name: string;
    description: string;
    distanceKm: number;
    durationHours: number;
    elevationGainM: number;
    elevationLossM: number;
    waypoints: RouteWaypoint[];
}

const INITIAL_ROUTE_DETAIL: RouteDetailData = {
    id: 'route_01',
    name: 'Tuyến đường Đạp xe / Đi bộ Phạm Văn Đồng',
    description: 'Chạy dọc trục đường Phạm Văn Đồng qua các điểm nghỉ ngơi.',
    distanceKm: 4.8,
    durationHours: 1.2,
    elevationGainM: 15,
    elevationLossM: 10,
    waypoints: [
        { id: 'wp_start', label: 'A', coordinate: [106.6860, 10.8250], name: 'Điểm khởi hành A' },
        { id: 'wp_1', label: '1', coordinate: [106.6870, 10.8238], name: 'Trạm dừng 1 (Nguyễn Thái Sơn)' },
        { id: 'wp_2', label: '2', coordinate: [106.6880, 10.8225], name: 'Trạm dừng 2 (Lê Quang Định)' },
        { id: 'wp_end', label: 'B', coordinate: [106.6898, 10.8200], name: 'Điểm kết thúc B' },
    ],
};

export default function ManageRouteScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string }>();
    const insets = useSafeAreaInsets();
    const cameraRef = useRef<any>(null);

    const [route, setRoute] = useState<RouteDetailData>(INITIAL_ROUTE_DETAIL);
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
    const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);

    const fetchDirections = async (waypoints: RouteWaypoint[]) => {
        if (waypoints.length < 2) return;
        setIsCalculatingRoute(true);

        try {
            const coordinatesString = waypoints.map((w) => `${w.coordinate[0]},${w.coordinate[1]}`).join(';');
            const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinatesString}?geometries=geojson&overview=full&access_token=${MAPBOX_KEY}`
            );
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const primaryRoute = data.routes[0];
                setRouteGeometry(primaryRoute.geometry.coordinates);
                setRoute((prev) => ({
                    ...prev,
                    distanceKm: parseFloat((primaryRoute.distance / 1000).toFixed(2)),
                    durationHours: parseFloat((primaryRoute.duration / 3600).toFixed(1)),
                }));
            } else {
                setRouteGeometry(waypoints.map((w) => w.coordinate));
            }
        } catch (error) {
            console.log('Lỗi tính toán đường đi:', error);
            setRouteGeometry(waypoints.map((w) => w.coordinate));
        } finally {
            setIsCalculatingRoute(false);
        }
    };

    useEffect(() => {
        fetchDirections(route.waypoints);
    }, []);

    const handleMapPress = (e: any) => {
        const coords = e?.geometry?.coordinates;
        if (!coords) return;

        const newPoint: RouteWaypoint = {
            id: `wp_${Date.now()}`,
            label: `${route.waypoints.length - 1}`,
            coordinate: [coords[0], coords[1]],
            name: `Trạm dừng ${route.waypoints.length - 1}`,
        };

        const updated = [...route.waypoints];
        updated.splice(updated.length - 1, 0, newPoint);

        setRoute((prev) => ({
            ...prev,
            waypoints: updated,
        }));

        fetchDirections(updated);
    };

    const handleRemoveWaypoint = (id: string) => {
        if (route.waypoints.length <= 2) {
            Alert.alert('Thông báo', 'Tuyến đường cần tối thiểu 2 điểm (Điểm A và Điểm B).');
            return;
        }

        const filtered = route.waypoints.filter((w) => w.id !== id);
        const reIndexed = filtered.map((w, index) => {
            if (index === 0) return { ...w, label: 'A' };
            if (index === filtered.length - 1) return { ...w, label: 'B' };
            return { ...w, label: `${index}` };
        });

        setRoute((prev) => ({
            ...prev,
            waypoints: reIndexed,
        }));

        fetchDirections(reIndexed);
    };

    const handleDeleteRoute = () => {
        Alert.alert('Xoá Tuyến đường', 'Bạn có chắc chắn muốn xoá lộ trình này không?', [
            { text: 'Huỷ', style: 'cancel' },
            { text: 'Xoá', style: 'destructive', onPress: () => router.back() },
        ]);
    };

    const bottomCardMargin = Math.max(insets.bottom, 16);

    return (
        <View style={styles.container}>
            <Mapbox.MapView
                style={StyleSheet.absoluteFill}
                styleURL={Mapbox.StyleURL.Outdoors}
                onPress={handleMapPress}
                logoEnabled={false}
                attributionEnabled={false}
                compassEnabled={false}
                scaleBarEnabled={false}
            >
                <Mapbox.Camera
                    ref={cameraRef}
                    zoomLevel={14.5}
                    centerCoordinate={route.waypoints[0]?.coordinate || [106.6882, 10.8225]}
                />

                {routeGeometry.length > 0 && (
                    <Mapbox.ShapeSource
                        id="manageRouteSource"
                        shape={{
                            type: 'Feature',
                            geometry: {
                                type: 'LineString',
                                coordinates: routeGeometry,
                            },
                            properties: {},
                        }}
                    >
                        <Mapbox.LineLayer
                            id="manageRouteLine"
                            style={{
                                lineColor: '#2563EB',
                                lineWidth: 6,
                                lineCap: 'round',
                                lineJoin: 'round',
                            }}
                        />
                    </Mapbox.ShapeSource>
                )}

                {route.waypoints.map((wp) => (
                    <Mapbox.PointAnnotation
                        key={wp.id}
                        id={wp.id}
                        coordinate={wp.coordinate}
                    >
                        <View
                            style={[
                                styles.waypointBadge,
                                wp.label === 'A' && styles.wpBadgeA,
                                wp.label === 'B' && styles.wpBadgeB,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.waypointBadgeText,
                                    (wp.label === 'A' || wp.label === 'B') && { color: '#0F172A' },
                                ]}
                            >
                                {wp.label}
                            </Text>
                        </View>
                    </Mapbox.PointAnnotation>
                ))}
            </Mapbox.MapView>

            {isCalculatingRoute && (
                <View style={styles.calculatingOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.calculatingText}>Updating route...</Text>
                </View>
            )}

            <View style={styles.overlayContainer} pointerEvents="box-none">
                <View
                    style={[
                        styles.topRow,
                        { paddingTop: insets.top + (Platform.OS === 'android' ? 12 : 6) },
                    ]}
                    pointerEvents="box-none"
                >
                    <TouchableOpacity
                        style={styles.circleBtn}
                        activeOpacity={0.8}
                        onPress={() => router.back()}
                    >
                        <Octicons name="chevron-left" size={24} color="#0F172A" />
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>MANAGE ROUTE</Text>

                    <TouchableOpacity
                        style={styles.circleBtn}
                        activeOpacity={0.8}
                        onPress={handleDeleteRoute}
                    >
                        <Octicons name="trash" size={18} color="#DC2626" />
                    </TouchableOpacity>
                </View>

                <View
                    style={[
                        styles.bottomSection,
                        { paddingBottom: bottomCardMargin },
                    ]}
                    pointerEvents="box-none"
                >
                    <View
                        style={styles.floatingCardContainer}
                        pointerEvents="auto"
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={styles.cardHeaderBox}>
                            <Text style={styles.routeNameText} numberOfLines={1}>
                                {route.name}
                            </Text>
                            <Text style={styles.routeTipText}>
                                Tap map to insert a stop • Tap (X) to remove
                            </Text>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statCol}>
                                <Text style={styles.statVal}>
                                    {route.distanceKm} <Text style={styles.statUnit}>km</Text>
                                </Text>
                                <Text style={styles.statLbl}>Distance</Text>
                            </View>

                            <View style={styles.statCol}>
                                <Text style={styles.statVal}>
                                    {route.durationHours} <Text style={styles.statUnit}>h</Text>
                                </Text>
                                <Text style={styles.statLbl}>Est. time</Text>
                            </View>

                            <View style={styles.statCol}>
                                <Text style={styles.statVal}>
                                    +{route.elevationGainM} <Text style={styles.statUnit}>m</Text>
                                </Text>
                                <Text style={styles.statLbl}>Elev. gain</Text>
                            </View>

                            <View style={styles.statCol}>
                                <Text style={styles.statVal}>
                                    {route.waypoints.length}
                                </Text>
                                <Text style={styles.statLbl}>Waypoints</Text>
                            </View>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.waypointChipScroll}
                        >
                            {route.waypoints.map((wp) => {
                                const isEndpoint = wp.label === 'A' || wp.label === 'B';
                                return (
                                    <View key={wp.id} style={styles.waypointChip}>
                                        <View
                                            style={[
                                                styles.chipBadge,
                                                wp.label === 'A' && styles.wpBadgeA,
                                                wp.label === 'B' && styles.wpBadgeB,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.chipBadgeText,
                                                    (wp.label === 'A' || wp.label === 'B') && { color: '#0F172A' },
                                                ]}
                                            >
                                                {wp.label}
                                            </Text>
                                        </View>
                                        <Text style={styles.chipName} numberOfLines={1}>
                                            {wp.name}
                                        </Text>

                                        {!isEndpoint && (
                                            <TouchableOpacity
                                                style={styles.chipDeleteBtn}
                                                onPress={() => handleRemoveWaypoint(wp.id)}
                                            >
                                                <Octicons name="x" size={14} color="#64748B" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    overlayContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
    },
    headerTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 22,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    circleBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    calculatingOverlay: {
        position: 'absolute',
        top: 110,
        alignSelf: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        zIndex: 99,
    },
    calculatingText: {
        color: '#FFFFFF',
        fontFamily: 'GoogleSans-Medium',
        fontSize: 13,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    waypointBadge: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    wpBadgeA: {
        backgroundColor: '#bee8ff',
    },
    wpBadgeB: {
        backgroundColor: '#f6eab2',
    },
    waypointBadgeText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    bottomSection: {
        paddingHorizontal: 16,
    },
    floatingCardContainer: {
        backgroundColor: '#f5f4f7',
        borderRadius: 24,
        overflow: 'hidden',
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 18,
        gap: 12,
    },
    cardHeaderBox: {
        gap: 2,
    },
    routeNameText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 17,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    routeTipText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 12,
        color: '#64748B',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#FFFFFF',
        paddingVertical: 10,
        borderRadius: 16,
    },
    statCol: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    statVal: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    statUnit: {
        fontSize: 11,
        fontFamily: 'GoogleSans-Regular',
        color: '#64748B',
    },
    statLbl: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    waypointChipScroll: {
        gap: 8,
        paddingVertical: 2,
    },
    waypointChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingLeft: 4,
        paddingRight: 10,
        height: 36,
        gap: 8,
    },
    chipBadge: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    chipBadgeText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 12,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    chipName: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 13,
        color: '#0F172A',
        maxWidth: 120,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    chipDeleteBtn: {
        padding: 4,
    },
});