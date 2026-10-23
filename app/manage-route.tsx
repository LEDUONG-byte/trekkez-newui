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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';

const MAPBOX_KEY = process.env.EXPO_PUBLIC_MAPBOX_KEY;
if (MAPBOX_KEY) {
    Mapbox.setAccessToken(MAPBOX_KEY);
}

type ScreenState = 'INITIAL' | 'PIN_SELECTED' | 'WAYPOINT_PANEL' | 'ROUTE_ACTIVE';

interface WaypointItem {
    id: string;
    coordinate: [number, number];
    label: string;
}

export interface RouteManageData {
    id: string;
    name: string;
    description: string;
    waypoints: WaypointItem[];
}

// Dữ liệu route mẫu có sẵn để quản lý
const INITIAL_ROUTE_MANAGE: RouteManageData = {
    id: 'route_01',
    name: 'Tuyến đường Đạp xe / Đi bộ Phạm Văn Đồng',
    description: 'Chạy dọc trục đường Phạm Văn Đồng qua các điểm nghỉ ngơi.',
    waypoints: [
        { id: 'wp_start', label: 'A', coordinate: [106.6860, 10.8250] },
        { id: 'wp_1', label: '1', coordinate: [106.6870, 10.8238] },
        { id: 'wp_2', label: '2', coordinate: [106.6880, 10.8225] },
        { id: 'wp_end', label: 'B', coordinate: [106.6898, 10.8200] },
    ],
};

export default function ManageRouteScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const cameraRef = useRef<any>(null);
    const insets = useSafeAreaInsets();

    const initialStart = INITIAL_ROUTE_MANAGE.waypoints[0];
    const initialEnd = INITIAL_ROUTE_MANAGE.waypoints[INITIAL_ROUTE_MANAGE.waypoints.length - 1];
    const initialWps = INITIAL_ROUTE_MANAGE.waypoints.slice(1, -1);

    const [screenState, setScreenState] = useState<ScreenState>('ROUTE_ACTIVE');
    const [isEdited, setIsEdited] = useState(false);

    const [startLocationText, setStartLocationText] = useState('Điểm khởi hành A');
    const [destinationText, setDestinationText] = useState('Điểm kết thúc B');
    const [waypointMode, setWaypointMode] = useState<'along' | 'end'>('along');
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

    const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
    const [selectedPin, setSelectedPin] = useState<[number, number] | null>(null);

    const [currentZoom, setCurrentZoom] = useState<number>(15);
    const [centerLat, setCenterLat] = useState<number>(10.8225);

    const [startPoint, setStartPoint] = useState<WaypointItem | null>(initialStart);
    const [destinationPoint, setDestinationPoint] = useState<WaypointItem | null>(initialEnd);
    const [waypointsList, setWaypointsList] = useState<WaypointItem[]>(
        initialWps.map((wp, index) => ({ ...wp, label: `${index + 1}` }))
    );

    const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
    const [routeStats, setRouteStats] = useState({
        distance: 0,
        duration: 0,
        elevGain: 0,
        elevLoss: 0,
    });

    // -----------------------------------------------------------------
    // TÍNH TOÁN THANH TỶ LỆ CHỮ L THEO MỨC ZOOM VÀ VĨ ĐỘ
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

    // Cảnh báo người dùng khi thoát màn hình mà có thay đổi chưa lưu
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (!isEdited) return;

            e.preventDefault();

            Alert.alert(
                'Lưu thay đổi?',
                'Bạn có những thay đổi chưa lưu trên lộ trình này. Bạn có muốn lưu lại không?',
                [
                    { text: 'Hủy', style: 'cancel', onPress: () => { } },
                    { text: 'Không lưu', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
                    {
                        text: 'Lưu',
                        onPress: () => {
                            handleSave();
                            navigation.dispatch(e.data.action);
                        },
                    },
                ]
            );
        });

        return unsubscribe;
    }, [navigation, isEdited, startPoint, destinationPoint, waypointsList]);

    useEffect(() => {
        if (startPoint && destinationPoint) {
            generateRoute(startPoint.coordinate, destinationPoint.coordinate, waypointsList, true);
        }

        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            try {
                let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                setUserCoords([location.coords.longitude, location.coords.latitude]);
            } catch (error) {
                console.log('GPS Error:', error);
            }
        })();
    }, []);

    const generateRoute = async (
        start: [number, number],
        end: [number, number],
        waypoints: WaypointItem[] = [],
        isInitialLoad: boolean = false
    ) => {
        setIsCalculatingRoute(true);
        try {
            const allPoints = [start, ...waypoints.map((w) => w.coordinate), end];
            const coordinatesString = allPoints.map((pt) => `${pt[0]},${pt[1]}`).join(';');

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
                setRouteGeometry(allPoints);
            }

            if (cameraRef.current && !isInitialLoad) {
                const midLng = (start[0] + end[0]) / 2;
                const midLat = (start[1] + end[1]) / 2;
                cameraRef.current.setCamera({
                    centerCoordinate: [midLng, midLat],
                    zoomLevel: 15,
                    animationDuration: 900,
                });
            }

            setScreenState('ROUTE_ACTIVE');
        } catch (error) {
            console.log('Route calculation error:', error);
            setRouteGeometry([start, ...waypoints.map((w) => w.coordinate), end]);
            setScreenState('ROUTE_ACTIVE');
        } finally {
            setIsCalculatingRoute(false);
            setSelectedPin(null);
        }
    };

    const handleMapPress = (e: any) => {
        const coords = e?.geometry?.coordinates;
        const clickedLngLat: [number, number] = coords || [106.6882, 10.8225];

        if (screenState === 'ROUTE_ACTIVE') {
            setSelectedPin(clickedLngLat);
            setScreenState('WAYPOINT_PANEL');
            return;
        }

        setSelectedPin(clickedLngLat);
        setScreenState('PIN_SELECTED');
    };

    const handleSetStartPoint = () => {
        if (!selectedPin) return;
        const newStart: WaypointItem = {
            id: 'point-a',
            coordinate: selectedPin,
            label: 'A',
        };
        setStartPoint(newStart);
        setStartLocationText('Selected location');
        setIsEdited(true);
        setSelectedPin(null);

        if (destinationPoint) {
            generateRoute(newStart.coordinate, destinationPoint.coordinate, waypointsList);
        } else {
            setScreenState('INITIAL');
        }
    };

    const handleSetDestination = () => {
        if (!selectedPin) return;

        const effectiveStart = startPoint?.coordinate || userCoords || [106.6882, 10.8225];
        if (!startPoint) {
            setStartPoint({
                id: 'point-a',
                coordinate: effectiveStart,
                label: 'A',
            });
        }

        const newEnd: WaypointItem = {
            id: 'point-b',
            coordinate: selectedPin,
            label: 'B',
        };
        setDestinationPoint(newEnd);
        setDestinationText('Selected destination');
        setIsEdited(true);

        generateRoute(effectiveStart, newEnd.coordinate, waypointsList);
    };

    // LOGIC THÊM WAYPOINT THEO TÙY CHỌN "ALONG" HOẶC "END"
    const handleAddWaypoint = () => {
        if (!selectedPin || !startPoint || !destinationPoint) return;

        if (waypointMode === 'end') {
            // "Add to end": Điểm B cũ trở thành waypoint, vị trí pin mới trở thành điểm B
            const formerEndAsWaypoint: WaypointItem = {
                id: `wp-${Date.now()}-former-b`,
                coordinate: destinationPoint.coordinate,
                label: `${waypointsList.length + 1}`,
            };

            const newEnd: WaypointItem = {
                id: 'point-b',
                coordinate: selectedPin,
                label: 'B',
            };

            const updatedWaypoints = [...waypointsList, formerEndAsWaypoint];
            setWaypointsList(updatedWaypoints);
            setDestinationPoint(newEnd);
            setDestinationText('Selected destination');
            setIsEdited(true);

            generateRoute(startPoint.coordinate, newEnd.coordinate, updatedWaypoints);
        } else {
            // "Add along the way": Chèn waypoint mới vào giữa chặng
            const newWaypoint: WaypointItem = {
                id: `wp-${Date.now()}`,
                coordinate: selectedPin,
                label: `${waypointsList.length + 1}`,
            };

            const updatedWaypoints = [...waypointsList, newWaypoint];
            setWaypointsList(updatedWaypoints);
            setIsEdited(true);

            generateRoute(startPoint.coordinate, destinationPoint.coordinate, updatedWaypoints);
        }
    };

    const handleResetRoute = () => {
        setWaypointsList([]);
        setIsEdited(true);
        setIsMoreMenuOpen(false);

        if (startPoint && destinationPoint) {
            generateRoute(startPoint.coordinate, destinationPoint.coordinate, []);
        }
    };

    const handleSave = () => {
        console.log('Saved updated route successfully!');
        setIsEdited(false);
    };

    const handleCenterOnUser = async () => {
        try {
            let location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            const coords: [number, number] = [location.coords.longitude, location.coords.latitude];
            setUserCoords(coords);
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
                    centerCoordinate={startPoint?.coordinate || [106.6882, 10.8225]}
                />

                <Mapbox.UserLocation visible={true} androidRenderMode="compass" />

                {selectedPin && (
                    <Mapbox.PointAnnotation id="selected-pin" coordinate={selectedPin}>
                        <View style={styles.redPinMarker}>
                            <Octicons name="location" size={32} color="#EF4444" />
                        </View>
                    </Mapbox.PointAnnotation>
                )}

                {startPoint && (
                    <Mapbox.PointAnnotation id="point-a-marker" coordinate={startPoint.coordinate}>
                        <View style={[styles.waypointBadge, { backgroundColor: '#bee8ff' }]}>
                            <Text style={[styles.waypointBadgeText, { color: '#0F172A' }]}>A</Text>
                        </View>
                    </Mapbox.PointAnnotation>
                )}

                {destinationPoint && (
                    <Mapbox.PointAnnotation id="point-b-marker" coordinate={destinationPoint.coordinate}>
                        <View style={[styles.waypointBadge, { backgroundColor: '#f6eab2' }]}>
                            <Text style={[styles.waypointBadgeText, { color: '#0F172A' }]}>B</Text>
                        </View>
                    </Mapbox.PointAnnotation>
                )}

                {waypointsList.map((wp) => (
                    <Mapbox.PointAnnotation key={wp.id} id={wp.id} coordinate={wp.coordinate}>
                        <View style={[styles.waypointBadge, { backgroundColor: '#0F172A' }]}>
                            <Text style={styles.waypointBadgeText}>{wp.label}</Text>
                        </View>
                    </Mapbox.PointAnnotation>
                ))}

                {routeGeometry.length > 0 && (
                    <Mapbox.ShapeSource
                        id="routeSource"
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
                            id="routeLine"
                            style={{
                                lineColor: '#2563EB',
                                lineWidth: 6,
                                lineCap: 'round',
                                lineJoin: 'round',
                            }}
                        />
                    </Mapbox.ShapeSource>
                )}
            </Mapbox.MapView>

            {isCalculatingRoute && (
                <View style={styles.calculatingOverlay}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.calculatingText}>Updating route...</Text>
                </View>
            )}

            {/* OVERLAY UI */}
            <View style={styles.overlayContainer} pointerEvents="box-none">
                {/* 1. TOP HEADER */}
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

                    <View style={styles.topRightRow} pointerEvents="box-none">
                        <TouchableOpacity
                            style={styles.circleBtn}
                            activeOpacity={0.8}
                            onPress={() => {
                                // Mở tìm kiếm địa điểm
                            }}
                        >
                            <Octicons name="search" size={20} color="#0F172A" />
                        </TouchableOpacity>

                        {/* NÚT LƯU: CHỈ HIỂN THỊ KHI CÓ CHỈNH SỬA VÀ LƯU TRỰC TIẾP */}
                        {isEdited && (
                            <TouchableOpacity
                                style={styles.saveRouteBtn}
                                activeOpacity={0.85}
                                onPress={() => {
                                    handleSave();
                                    router.back();
                                }}
                            >
                                <Text style={styles.saveRouteBtnText}>Save</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* 2. BOTTOM SECTION */}
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

                    {/* Card nổi màu nền #f5f4f7 */}
                    <View
                        style={styles.floatingCardContainer}
                        pointerEvents="auto"
                        onStartShouldSetResponder={() => true}
                    >
                        {screenState === 'INITIAL' && (
                            <View style={styles.cardContentBox}>
                                <Text style={styles.sheetTitle}>
                                    Tap the map or search a place to start planning
                                </Text>

                                <View style={styles.inputsWrapper}>
                                    <View style={styles.verticalConnector} />

                                    <View style={styles.inputRowContainer}>
                                        <View style={[styles.badgeCircle, { backgroundColor: '#bee8ff' }]}>
                                            <Text style={[styles.badgeText, { color: '#0F172A' }]}>A</Text>
                                        </View>
                                        <TextInput
                                            style={styles.inputField}
                                            value={startLocationText}
                                            onChangeText={setStartLocationText}
                                            placeholder="Enter starting point"
                                            placeholderTextColor="#94A3B8"
                                        />
                                        {startLocationText.length > 0 && (
                                            <TouchableOpacity
                                                style={styles.clearBtn}
                                                onPress={() => setStartLocationText('')}
                                            >
                                                <Octicons name="x" size={16} color="#64748B" />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    <View style={styles.inputRowContainer}>
                                        <View style={[styles.badgeCircle, { backgroundColor: '#f6eab2' }]}>
                                            <Text style={[styles.badgeText, { color: '#0F172A' }]}>B</Text>
                                        </View>
                                        <TextInput
                                            style={[styles.inputField, !destinationText && styles.inputFieldPlaceholder]}
                                            value={destinationText}
                                            placeholder="Tap map to choose destination"
                                            placeholderTextColor="#94A3B8"
                                            editable={false}
                                        />
                                    </View>
                                </View>
                            </View>
                        )}

                        {screenState === 'PIN_SELECTED' && (
                            <View style={styles.pinSelectedContent}>
                                <View style={styles.pinHeaderRow}>
                                    <View style={styles.pinInfoCol}>
                                        <Text style={styles.pinInfoTitle}>Selected Location</Text>
                                        <Text style={styles.pinInfoSubtitle}>
                                            Tap button below to set as start or destination
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.closeCardBtn}
                                        onPress={() => {
                                            setSelectedPin(null);
                                            setScreenState(routeGeometry.length > 0 ? 'ROUTE_ACTIVE' : 'INITIAL');
                                        }}
                                    >
                                        <Octicons name="x" size={18} color="#0F172A" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.pinActionButtonsRow}>
                                    <TouchableOpacity
                                        style={styles.pinPrimaryBtn}
                                        activeOpacity={0.8}
                                        onPress={handleSetStartPoint}
                                    >
                                        <View style={[styles.badgeCircleSmall, { backgroundColor: '#bee8ff' }]}>
                                            <Text style={[styles.badgeTextSmall, { color: '#0F172A' }]}>A</Text>
                                        </View>
                                        <Text style={styles.pinBtnText}>Start here</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.pinPrimaryBtn}
                                        activeOpacity={0.8}
                                        onPress={handleSetDestination}
                                    >
                                        <View style={[styles.badgeCircleSmall, { backgroundColor: '#f6eab2' }]}>
                                            <Text style={[styles.badgeTextSmall, { color: '#0F172A' }]}>B</Text>
                                        </View>
                                        <Text style={styles.pinBtnText}>Route to here</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {screenState === 'WAYPOINT_PANEL' && (
                            <View style={styles.waypointPanelContent}>
                                <View style={styles.waypointTopRow}>
                                    <View>
                                        <Text style={styles.waypointTitle}>Waypoint</Text>
                                        <Text style={styles.waypointDistance}>Add intermediate stop</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.closeCardBtn}
                                        onPress={() => {
                                            setSelectedPin(null);
                                            setScreenState('ROUTE_ACTIVE');
                                        }}
                                    >
                                        <Octicons name="x" size={18} color="#0F172A" />
                                    </TouchableOpacity>
                                </View>

                                {/* Radio Options: Add to end vs Add along the way */}
                                <View style={styles.radioOptionsRow}>
                                    <TouchableOpacity
                                        style={styles.radioItem}
                                        onPress={() => setWaypointMode('end')}
                                    >
                                        <View style={[styles.radioCircle, waypointMode === 'end' && styles.radioCircleSelected]} />
                                        <Text style={styles.radioLabel}>Add to end</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.radioItem}
                                        onPress={() => setWaypointMode('along')}
                                    >
                                        <View style={[styles.radioCircle, waypointMode === 'along' && styles.radioCircleSelected]} />
                                        <Text style={styles.radioLabel}>Add along the way</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Nút Add to route (Đã lược bỏ phần toggle Off-grid) */}
                                <View style={styles.waypointFooterRow}>
                                    <TouchableOpacity
                                        style={styles.addRouteConfirmBtn}
                                        activeOpacity={0.85}
                                        onPress={handleAddWaypoint}
                                    >
                                        <Octicons name="plus" size={16} color="#FFFFFF" />
                                        <Text style={styles.addRouteConfirmText}>Add to route</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {screenState === 'ROUTE_ACTIVE' && (
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
                                        {waypointsList.length}
                                    </Text>
                                    <Text style={styles.statLabel}>Waypoints</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {/* Menu mở rộng (dấu 3 chấm) */}
            <Modal visible={isMoreMenuOpen} transparent animationType="fade" onRequestClose={() => setIsMoreMenuOpen(false)}>
                <TouchableWithoutFeedback onPress={() => setIsMoreMenuOpen(false)}>
                    <View style={styles.modalOverlayBottomLeft}>
                        <View style={styles.popoverMenu}>
                            <TouchableOpacity
                                style={styles.popoverOptionRow}
                                onPress={() => setIsMoreMenuOpen(false)}
                            >
                                <Octicons name="reply" size={18} color="#0F172A" />
                                <Text style={styles.popoverOptionTextBold}>Redo</Text>
                            </TouchableOpacity>
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
    topRightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    saveRouteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#207bfb',
        paddingHorizontal: 20,
        paddingVertical: 11,
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
    cardContentBox: {
        width: '100%',
    },
    sheetTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#0F172A',
        marginBottom: 16,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    inputsWrapper: {
        position: 'relative',
        gap: 12,
        width: '100%',
    },
    verticalConnector: {
        position: 'absolute',
        top: 26,
        left: 21,
        width: 2,
        height: 38,
        backgroundColor: '#CBD5E1',
        zIndex: 1,
    },
    inputRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 9999,
        paddingHorizontal: 12,
        height: 52,
        zIndex: 2,
        width: '100%',
    },
    badgeCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    badgeText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    inputField: {
        flex: 1,
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#26282c',
        includeFontPadding: false,
        textAlignVertical: 'center',
        paddingVertical: 0,
    },
    inputFieldPlaceholder: {
        color: '#94A3B8',
    },
    clearBtn: {
        padding: 6,
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
    pinActionButtonsRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    pinPrimaryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 10,
    },
    badgeCircleSmall: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeTextSmall: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 12,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    pinBtnText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    waypointPanelContent: {
        gap: 16,
        width: '100%',
    },
    waypointTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    waypointTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 20,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    waypointDistance: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 14,
        color: '#64748B',
        marginTop: 2,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    radioOptionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 4,
    },
    radioItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#E2E8F0',
    },
    radioCircleSelected: {
        backgroundColor: '#207bfb',
    },
    radioLabel: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    waypointFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    addRouteConfirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#42444b',
        paddingHorizontal: 22,
        paddingVertical: 12,
        borderRadius: 20,
        gap: 8,
        width: '100%',
    },
    addRouteConfirmText: {
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