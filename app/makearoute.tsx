import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Platform,
    Modal,
    TouchableWithoutFeedback,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';

const MAPBOX_KEY = process.env.EXPO_PUBLIC_MAPBOX_KEY;
if (MAPBOX_KEY) {
    Mapbox.setAccessToken(MAPBOX_KEY);
}

export interface RouteWaypoint {
    id: string;
    label: string;
    coordinate: [number, number]; // [lng, lat]
    name: string;
}

export interface RouteManageData {
    id: string;
    name: string;
    description: string;
    waypoints: RouteWaypoint[];
}

const INITIAL_ROUTE_MANAGE: RouteManageData = {
    id: 'route_01',
    name: 'Tuyến đường Đạp xe / Đi bộ Phạm Văn Đồng',
    description: 'Chạy dọc trục đường Phạm Văn Đồng qua các điểm nghỉ ngơi.',
    waypoints: [
        { id: 'wp_start', label: 'A', coordinate: [106.6860, 10.8250], name: 'Điểm khởi hành A' },
        { id: 'wp_1', label: '1', coordinate: [106.6870, 10.8238], name: 'Trạm dừng 1' },
        { id: 'wp_2', label: '2', coordinate: [106.6880, 10.8225], name: 'Trạm dừng 2' },
        { id: 'wp_end', label: 'B', coordinate: [106.6898, 10.8200], name: 'Điểm kết thúc B' },
    ],
};

export default function ManageRouteScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string }>();
    const insets = useSafeAreaInsets();
    const cameraRef = useRef<any>(null);

    const [route, setRoute] = useState<RouteManageData>(INITIAL_ROUTE_MANAGE);
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
    const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);

    const [selectedPin, setSelectedPin] = useState<[number, number] | null>(null);
    const [activeWaypoint, setActiveWaypoint] = useState<RouteWaypoint | null>(null);

    const [currentZoom, setCurrentZoom] = useState<number>(16);
    const [centerLat, setCenterLat] = useState<number>(10.8225);

    // Modals
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

    // Thống kê lộ trình
    const [routeStats, setRouteStats] = useState({
        distance: 0,
        duration: 0,
        elevGain: 0,
        elevLoss: 0,
    });

    // -----------------------------------------------------------------
    // TÍNH TOÁN THANH TỶ LỆ CHỮ L THEO ZOOM & LATITUDE
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
        if (typeof zoom === 'number') setCurrentZoom(zoom);
        if (Array.isArray(center) && center.length === 2) setCenterLat(center[1]);
    };

    // 1. Tính toán hướng đi qua Mapbox Directions API
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
                setRouteStats({
                    distance: Math.round(primaryRoute.distance),
                    duration: Math.max(1, Math.round(primaryRoute.duration / 60)),
                    elevGain: 0,
                    elevLoss: 0,
                });
            } else {
                setRouteGeometry(waypoints.map((w) => w.coordinate));
            }
        } catch (error) {
            console.log('Directions error:', error);
            setRouteGeometry(waypoints.map((w) => w.coordinate));
        } finally {
            setIsCalculatingRoute(false);
        }
    };

    useEffect(() => {
        fetchDirections(route.waypoints);
    }, []);

    // 2. Chạm vào bản đồ để thêm trạm dừng mới
    const handleMapPress = (e: any) => {
        const coords = e?.geometry?.coordinates;
        if (!coords) return;

        const clickedLngLat: [number, number] = [coords[0], coords[1]];
        setSelectedPin(clickedLngLat);
        setActiveWaypoint(null);
    };

    // Thêm trạm dừng vào cuối trước điểm B
    const handleAddWaypointToRoute = () => {
        if (!selectedPin) return;

        const newPoint: RouteWaypoint = {
            id: `wp_${Date.now()}`,
            label: `${route.waypoints.length - 1}`,
            coordinate: selectedPin,
            name: `Waypoint ${route.waypoints.length - 1}`,
        };

        const updated = [...route.waypoints];
        updated.splice(updated.length - 1, 0, newPoint);

        const reIndexed = updated.map((w, index) => {
            if (index === 0) return { ...w, label: 'A' };
            if (index === updated.length - 1) return { ...w, label: 'B' };
            return { ...w, label: `${index}` };
        });

        setRoute((prev) => ({ ...prev, waypoints: reIndexed }));
        setSelectedPin(null);
        fetchDirections(reIndexed);
    };

    // Xoá trạm dừng
    const handleRemoveWaypoint = (id: string) => {
        if (route.waypoints.length <= 2) {
            Alert.alert('Notice', 'Route requires at least 2 points (Start and Destination).');
            return;
        }

        const filtered = route.waypoints.filter((w) => w.id !== id);
        const reIndexed = filtered.map((w, index) => {
            if (index === 0) return { ...w, label: 'A' };
            if (index === filtered.length - 1) return { ...w, label: 'B' };
            return { ...w, label: `${index}` };
        });

        setRoute((prev) => ({ ...prev, waypoints: reIndexed }));
        setActiveWaypoint(null);
        fetchDirections(reIndexed);
    };

    const handleResetRoute = () => {
        Alert.alert('Reset Route', 'Are you sure you want to reset this route?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Reset',
                style: 'destructive',
                onPress: () => {
                    const defaultWp = [
                        route.waypoints[0],
                        route.waypoints[route.waypoints.length - 1],
                    ];
                    setRoute((prev) => ({ ...prev, waypoints: defaultWp }));
                    setSelectedPin(null);
                    setActiveWaypoint(null);
                    fetchDirections(defaultWp);
                    setIsMoreMenuOpen(false);
                },
            },
        ]);
    };

    const handleCenterOnUser = async () => {
        try {
            let location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            const coords: [number, number] = [location.coords.longitude, location.coords.latitude];
            setCenterLat(location.coords.latitude);
            if (cameraRef.current) {
                cameraRef.current.setCamera({
                    centerCoordinate: coords,
                    zoomLevel: 16.5,
                    animationDuration: 800,
                });
            }
        } catch (error) {
            console.log('Location error:', error);
        }
    };

    return (
        <View style={styles.container}>
            <Mapbox.MapView
                style={StyleSheet.absoluteFill}
                styleURL={Mapbox.StyleURL.Outdoors}
                onPress={handleMapPress}
                onCameraChanged={handleCameraChanged}
                onRegionDidChange={handleCameraChanged}
                logoEnabled={false}
                attributionEnabled={false}
                compassEnabled={false}
                scaleBarEnabled={false}
            >
                <Mapbox.Camera
                    ref={cameraRef}
                    zoomLevel={15}
                    centerCoordinate={route.waypoints[0]?.coordinate || [106.6882, 10.8225]}
                />

                <Mapbox.UserLocation visible={true} androidRenderMode="compass" />

                {/* Ghim tạm thời khi chạm thêm điểm */}
                {selectedPin && (
                    <Mapbox.PointAnnotation id="selected-pin" coordinate={selectedPin}>
                        <View style={styles.redPinMarker}>
                            <Octicons name="location" size={32} color="#EF4444" />
                        </View>
                    </Mapbox.PointAnnotation>
                )}

                {/* Vẽ tuyến đường Polyline */}
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

                {/* Markers các Waypoints */}
                {route.waypoints.map((wp) => (
                    <Mapbox.PointAnnotation
                        key={wp.id}
                        id={wp.id}
                        coordinate={wp.coordinate}
                        onSelected={() => setActiveWaypoint(wp)}
                    >
                        <View
                            style={[
                                styles.waypointBadge,
                                wp.label === 'A' && { backgroundColor: '#bee8ff' },
                                wp.label === 'B' && { backgroundColor: '#f6eab2' },
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

            {/* OVERLAY UI */}
            <View style={styles.overlayContainer} pointerEvents="box-none">
                {/* 1. TOP HEADER: Back button + Thanh tỷ lệ chữ L ở góc trái */}
                <View
                    style={[
                        styles.topRow,
                        { paddingTop: insets.top + (Platform.OS === 'android' ? 12 : 6) },
                    ]}
                    pointerEvents="box-none"
                >
                    <View style={styles.topLeftCol} pointerEvents="box-none">
                        <TouchableOpacity
                            style={styles.circleBtn}
                            activeOpacity={0.8}
                            onPress={() => router.back()}
                        >
                            <Octicons name="chevron-left" size={24} color="#0F172A" />
                        </TouchableOpacity>

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
                        style={styles.saveRouteBtn}
                        activeOpacity={0.85}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.saveRouteBtnText}>Save</Text>
                    </TouchableOpacity>
                </View>

                {/* 2. BOTTOM SECTION: Nút More (...) và GPS */}
                <View
                    style={[
                        styles.bottomSection,
                        { paddingBottom: Math.max(insets.bottom, 16) },
                    ]}
                    pointerEvents="box-none"
                >
                    <View style={styles.controlsRow} pointerEvents="box-none">
                        <TouchableOpacity
                            style={styles.circleBtn}
                            activeOpacity={0.8}
                            onPress={() => setIsMoreMenuOpen(true)}
                        >
                            <Octicons name="kebab-horizontal" size={20} color="#0F172A" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.circleBtn}
                            activeOpacity={0.8}
                            onPress={handleCenterOnUser}
                        >
                            <Octicons name="location" size={20} color="#0284C7" />
                        </TouchableOpacity>
                    </View>

                    {/* Card nổi quản lý route */}
                    <View
                        style={styles.floatingCardContainer}
                        pointerEvents="auto"
                        onStartShouldSetResponder={() => true}
                    >
                        {selectedPin ? (
                            <View style={styles.pinSelectedContent}>
                                <View style={styles.pinHeaderRow}>
                                    <View style={styles.pinInfoCol}>
                                        <Text style={styles.pinInfoTitle}>Add Waypoint</Text>
                                        <Text style={styles.pinInfoSubtitle}>
                                            Insert this stop into your route
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.closeCardBtn}
                                        onPress={() => setSelectedPin(null)}
                                    >
                                        <Octicons name="x" size={18} color="#0F172A" />
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={styles.addRouteConfirmBtn}
                                    activeOpacity={0.85}
                                    onPress={handleAddWaypointToRoute}
                                >
                                    <Octicons name="plus" size={16} color="#FFFFFF" />
                                    <Text style={styles.addRouteConfirmText}>Add to route</Text>
                                </TouchableOpacity>
                            </View>
                        ) : activeWaypoint ? (
                            <View style={styles.pinSelectedContent}>
                                <View style={styles.pinHeaderRow}>
                                    <View style={styles.pinInfoCol}>
                                        <Text style={styles.pinInfoTitle}>Waypoint: {activeWaypoint.name}</Text>
                                        <Text style={styles.pinInfoSubtitle}>
                                            Point {activeWaypoint.label} on route
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.closeCardBtn}
                                        onPress={() => setActiveWaypoint(null)}
                                    >
                                        <Octicons name="x" size={18} color="#0F172A" />
                                    </TouchableOpacity>
                                </View>

                                {activeWaypoint.label !== 'A' && activeWaypoint.label !== 'B' && (
                                    <TouchableOpacity
                                        style={styles.removeWaypointBtn}
                                        activeOpacity={0.85}
                                        onPress={() => {
                                            handleRemoveWaypoint(activeWaypoint.id);
                                            setActiveWaypoint(null);
                                        }}
                                    >
                                        <Octicons name="trash" size={16} color="#FFFFFF" />
                                        <Text style={styles.removeWaypointText}>Remove Stop</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            <View style={styles.statsContainer}>
                                <View style={styles.statCol}>
                                    <Text style={styles.statValue}>
                                        {routeStats.distance >= 1000
                                            ? (routeStats.distance / 1000).toFixed(1)
                                            : routeStats.distance}
                                        <Text style={styles.statUnit}>
                                            {routeStats.distance >= 1000 ? ' km' : ' m'}
                                        </Text>
                                    </Text>
                                    <Text style={styles.statLabel}>Distance</Text>
                                </View>

                                <View style={styles.statCol}>
                                    <Text style={styles.statValue}>
                                        {routeStats.duration}
                                        <Text style={styles.statUnit}> m</Text>
                                    </Text>
                                    <Text style={styles.statLabel}>Est. time</Text>
                                </View>

                                <View style={styles.statCol}>
                                    <Text style={styles.statValue}>
                                        {route.waypoints.length}
                                    </Text>
                                    <Text style={styles.statLabel}>Waypoints</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {/* Modal More Options (...) */}
            <Modal
                visible={isMoreMenuOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsMoreMenuOpen(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsMoreMenuOpen(false)}>
                    <View style={styles.modalOverlayBottomLeft}>
                        <View style={styles.popoverMenu}>
                            <TouchableOpacity
                                style={styles.popoverOptionRow}
                                onPress={handleResetRoute}
                            >
                                <Octicons name="trash" size={18} color="#C85213" />
                                <Text style={[styles.popoverOptionTextBold, { color: '#C85213' }]}>Reset route</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E2E8F0',
    },
    overlayContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
    },
    calculatingOverlay: {
        position: 'absolute',
        top: '40%',
        alignSelf: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        zIndex: 99,
    },
    calculatingText: {
        color: '#FFFFFF',
        fontFamily: 'GoogleSans-Medium',
        fontSize: 14,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    topLeftCol: {
        alignItems: 'flex-start',
    },
    saveRouteBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#207bfb',
        paddingHorizontal: 22,
        paddingVertical: 12,
        borderRadius: 24,
    },
    saveRouteBtnText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    circleBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
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
    bottomSection: {
        paddingHorizontal: 16,
        gap: 12,
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    redPinMarker: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    waypointBadge: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    waypointBadgeText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    floatingCardContainer: {
        backgroundColor: '#f5f4f7',
        borderRadius: 24,
        overflow: 'hidden',
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 20,
    },
    pinSelectedContent: {
        gap: 16,
        width: '100%',
    },
    pinHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    pinInfoCol: {
        flex: 1,
        paddingRight: 10,
    },
    pinInfoTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 18,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    pinInfoSubtitle: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 13,
        color: '#64748B',
        marginTop: 4,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    closeCardBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addRouteConfirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4D6B18',
        paddingVertical: 14,
        borderRadius: 20,
        gap: 8,
    },
    addRouteConfirmText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    removeWaypointBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#DC2626',
        paddingVertical: 14,
        borderRadius: 20,
        gap: 8,
    },
    removeWaypointText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 6,
        width: '100%',
    },
    statCol: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 22,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    statUnit: {
        fontSize: 14,
        fontFamily: 'GoogleSans-Regular',
        color: '#64748B',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    statLabel: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    modalOverlayBottomLeft: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.2)',
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        paddingBottom: 220,
        paddingLeft: 16,
    },
    popoverMenu: {
        width: 220,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingVertical: 8,
    },
    popoverOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    popoverOptionTextBold: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
});