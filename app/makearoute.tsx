import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Dimensions,
    Platform,
    Modal,
    TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';

// Cấu hình Mapbox Token
const MAPBOX_KEY = process.env.EXPO_PUBLIC_MAPBOX_KEY;
if (MAPBOX_KEY) {
    Mapbox.setAccessToken(MAPBOX_KEY);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ScreenState = 'INITIAL' | 'PIN_SELECTED' | 'WAYPOINT_PANEL' | 'ROUTE_ACTIVE';

interface WaypointPoint {
    latitude: number;
    longitude: number;
    label: string;
}

export default function MakeARouteScreen() {
    const router = useRouter();
    const cameraRef = useRef<any>(null);

    // -----------------------------------------------------------------
    // STATES MANAGEMENT
    // -----------------------------------------------------------------
    const [screenState, setScreenState] = useState<ScreenState>('INITIAL');
    const [startLocation, setStartLocation] = useState('Current location');
    const [destination, setDestination] = useState('');
    const [waypointMode, setWaypointMode] = useState<'along' | 'end'>('along');
    const [isOffGrid, setIsOffGrid] = useState(false);

    // Modals
    const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

    const [selectedPin, setSelectedPin] = useState<{ latitude: number; longitude: number } | null>(null);
    const [userCoords, setUserCoords] = useState<[number, number]>([106.6882, 10.8225]); // Mặc định TP.HCM

    // Xin quyền và lấy vị trí thực tế khi mở màn hình
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Quyền truy cập vị trí bị từ chối');
                return;
            }

            try {
                let location = await Location.getCurrentPositionAsync({});
                const coords: [number, number] = [location.coords.longitude, location.coords.latitude];
                setUserCoords(coords);

                // Di chuyển camera về vị trí thực tế của người dùng
                if (cameraRef.current) {
                    cameraRef.current.setCamera({
                        centerCoordinate: coords,
                        zoomLevel: 15,
                        animationDuration: 1000,
                    });
                }
            } catch (error) {
                console.log('Không lấy được vị trí GPS:', error);
            }
        })();
    }, []);

    // Hàm căn lại camera về vị trí người dùng khi bấm nút định vị bên phải
    const handleCenterOnUser = async () => {
        try {
            let location = await Location.getCurrentPositionAsync({});
            const coords: [number, number] = [location.coords.longitude, location.coords.latitude];
            setUserCoords(coords);
            if (cameraRef.current) {
                cameraRef.current.setCamera({
                    centerCoordinate: coords,
                    zoomLevel: 15,
                    animationDuration: 800,
                });
            }
        } catch (error) {
            console.log('Lỗi định vị:', error);
        }
    };

    // Tọa độ tuyến đường mẫu (A -> 1 -> 2 -> 3 -> B)
    const routeCoordinates: WaypointPoint[] = [
        { latitude: 10.8250, longitude: 106.6860, label: 'A' },
        { latitude: 10.8238, longitude: 106.6870, label: '1' },
        { latitude: 10.8225, longitude: 106.6880, label: '2' },
        { latitude: 10.8212, longitude: 106.6890, label: '3' },
        { latitude: 10.8200, longitude: 106.6898, label: 'B' },
    ];

    const handleMapPress = (e: any) => {
        if (screenState === 'ROUTE_ACTIVE') {
            setScreenState('WAYPOINT_PANEL');
            return;
        }

        const coords = e?.geometry?.coordinates;
        if (coords) {
            setSelectedPin({ longitude: coords[0], latitude: coords[1] });
        } else {
            setSelectedPin({ latitude: 10.8218, longitude: 106.6885 });
        }
        setScreenState('PIN_SELECTED');
    };

    const handleSetStartPoint = () => {
        setStartLocation('Vị trí hiện tại của bạn');
        setSelectedPin(null);
        if (destination) {
            setScreenState('ROUTE_ACTIVE');
        } else {
            setScreenState('INITIAL');
        }
    };

    const handleSetDestination = () => {
        setDestination('Điểm đến đã chọn');
        setSelectedPin(null);
        setScreenState('ROUTE_ACTIVE');
    };

    const handleResetRoute = () => {
        setStartLocation('');
        setDestination('');
        setSelectedPin(null);
        setScreenState('INITIAL');
        setIsMoreMenuOpen(false);
    };

    return (
        <View style={styles.container}>
            {/* ================= MAPBOX VIEW ================= */}
            <Mapbox.MapView
                style={StyleSheet.absoluteFill}
                styleURL={Mapbox.StyleURL.Outdoors}
                onPress={handleMapPress}
                logoEnabled={false}
                attributionEnabled={false}
                compassEnabled={false}
            >
                <Mapbox.Camera
                    ref={cameraRef}
                    zoomLevel={14}
                    centerCoordinate={userCoords}
                />

                <Mapbox.UserLocation visible={true} compassEnabled={true} />

                {/* Ghim vị trí được chạm chọn trên bản đồ */}
                {selectedPin && (
                    <Mapbox.PointAnnotation
                        id="selected-pin"
                        coordinate={[selectedPin.longitude, selectedPin.latitude]}
                    >
                        <View style={styles.redPinMarker}>
                            <Octicons name="location" size={28} color="#EF4444" />
                        </View>
                    </Mapbox.PointAnnotation>
                )}

                {/* Đường đi & Waypoints khi kích hoạt Route */}
                {screenState === 'ROUTE_ACTIVE' && (
                    <>
                        <Mapbox.ShapeSource
                            id="routeSource"
                            shape={{
                                type: 'Feature',
                                geometry: {
                                    type: 'LineString',
                                    coordinates: routeCoordinates.map(pt => [pt.longitude, pt.latitude]),
                                },
                                properties: {},
                            }}
                        >
                            <Mapbox.LineLayer
                                id="routeLine"
                                style={{
                                    lineColor: '#2563EB',
                                    lineWidth: 5,
                                    lineCap: 'round',
                                    lineJoin: 'round',
                                }}
                            />
                        </Mapbox.ShapeSource>

                        {routeCoordinates.map((pt, index) => (
                            <Mapbox.PointAnnotation
                                key={`waypoint-${index}`}
                                id={`waypoint-${index}`}
                                coordinate={[pt.longitude, pt.latitude]}
                            >
                                <View
                                    style={[
                                        styles.waypointBadge,
                                        pt.label === 'A' && { backgroundColor: '#48752C' },
                                        pt.label === 'B' && { backgroundColor: '#C85213' },
                                    ]}
                                >
                                    <Text style={styles.waypointBadgeText}>{pt.label}</Text>
                                </View>
                            </Mapbox.PointAnnotation>
                        ))}
                    </>
                )}
            </Mapbox.MapView>

            {/* ================= OVERLAY UI ================= */}
            <SafeAreaView style={styles.overlayContainer} pointerEvents="box-none">
                {/* 1. TOP FLOATING BUTTONS */}
                <View style={styles.topRow}>
                    <View style={styles.topLeftGroup}>
                        <TouchableOpacity style={styles.circleBtn} activeOpacity={0.8}>
                            <Octicons name="gear" size={20} color="#0F172A" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.circleBtn} activeOpacity={0.8}>
                            <Octicons name="person" size={20} color="#EA580C" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.topRightGroup}>
                        {screenState === 'ROUTE_ACTIVE' && (
                            <TouchableOpacity
                                style={styles.saveRouteBtn}
                                activeOpacity={0.85}
                                onPress={() => setIsSaveMenuOpen(true)}
                            >
                                <Text style={styles.saveRouteBtnText}>Save</Text>
                                <Octicons name="chevron-down" size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.circleBtn}
                            activeOpacity={0.8}
                            onPress={() => router.back()}
                        >
                            <Octicons name="x" size={22} color="#0F172A" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 2. RIGHT FLOATING BUTTONS */}
                <View style={styles.rightFloatCol}>
                    <TouchableOpacity style={styles.circleBtn} activeOpacity={0.8}>
                        <Octicons name="search" size={20} color="#0F172A" />
                    </TouchableOpacity>

                    {/* Nút định vị vị trí thực tế của người dùng */}
                    <TouchableOpacity
                        style={styles.circleBtn}
                        activeOpacity={0.8}
                        onPress={handleCenterOnUser}
                    >
                        <Octicons name="location" size={20} color="#0284C7" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.circleBtn} activeOpacity={0.8}>
                        <Octicons name="stack" size={20} color="#0F172A" />
                    </TouchableOpacity>
                </View>

                {/* 3. BOTTOM-LEFT MENU BUTTON (...) */}
                <View style={styles.bottomLeftFloat}>
                    <TouchableOpacity
                        style={styles.circleBtn}
                        activeOpacity={0.8}
                        onPress={() => setIsMoreMenuOpen(true)}
                    >
                        <Octicons name="kebab-horizontal" size={20} color="#0F172A" />
                    </TouchableOpacity>
                </View>

                {/* 4. BOTTOM SHEET PANEL */}
                <View style={styles.bottomSheetContainer}>
                    <View style={styles.handleBar} />

                    {screenState === 'INITIAL' && (
                        <>
                            <Text style={styles.sheetTitle}>
                                Tap the map or search a place to start planning
                            </Text>

                            <View style={styles.inputsWrapper}>
                                <View style={styles.verticalConnector} />

                                <View style={styles.inputRowContainer}>
                                    <View style={[styles.badgeCircle, { backgroundColor: '#48752C' }]}>
                                        <Text style={styles.badgeText}>A</Text>
                                    </View>
                                    <TextInput
                                        style={styles.inputField}
                                        value={startLocation}
                                        onChangeText={setStartLocation}
                                        placeholder="Enter starting point"
                                        placeholderTextColor="#94A3B8"
                                    />
                                    {startLocation.length > 0 && (
                                        <TouchableOpacity onPress={() => setStartLocation('')}>
                                            <Octicons name="x" size={18} color="#64748B" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <View style={styles.inputRowContainer}>
                                    <View style={[styles.badgeCircle, { backgroundColor: '#C85213' }]}>
                                        <Text style={styles.badgeText}>B</Text>
                                    </View>
                                    <TextInput
                                        style={[styles.inputField, !destination && styles.inputFieldPlaceholder]}
                                        value={destination}
                                        onChangeText={(val) => {
                                            setDestination(val);
                                            if (val.trim().length > 2) setScreenState('ROUTE_ACTIVE');
                                        }}
                                        placeholder="Enter Destination"
                                        placeholderTextColor="#855B32"
                                    />
                                </View>
                            </View>
                        </>
                    )}

                    {screenState === 'PIN_SELECTED' && (
                        <View style={styles.pinSelectedContent}>
                            <View style={styles.pinHeaderRow}>
                                <TouchableOpacity
                                    style={styles.closeCardBtn}
                                    onPress={() => setScreenState('INITIAL')}
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
                                    <View style={[styles.badgeCircleSmall, { backgroundColor: '#48752C' }]}>
                                        <Text style={styles.badgeTextSmall}>A</Text>
                                    </View>
                                    <Text style={styles.pinBtnText}>Start here</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.pinPrimaryBtn}
                                    activeOpacity={0.8}
                                    onPress={handleSetDestination}
                                >
                                    <View style={[styles.badgeCircleSmall, { backgroundColor: '#C85213' }]}>
                                        <Text style={styles.badgeTextSmall}>B</Text>
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
                                    <Text style={styles.waypointDistance}>427 m from you</Text>
                                    <Text style={styles.waypointAddress} numberOfLines={1}>
                                        📍 Vị trí điểm dừng trung gian
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.closeCardBtn}
                                    onPress={() => setScreenState('ROUTE_ACTIVE')}
                                >
                                    <Octicons name="x" size={18} color="#0F172A" />
                                </TouchableOpacity>
                            </View>

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

                            <View style={styles.waypointFooterRow}>
                                <TouchableOpacity
                                    style={styles.offGridToggle}
                                    activeOpacity={0.8}
                                    onPress={() => setIsOffGrid(!isOffGrid)}
                                >
                                    <View style={[styles.toggleTrack, isOffGrid && styles.toggleTrackActive]}>
                                        <View style={[styles.toggleThumb, isOffGrid && styles.toggleThumbActive]} />
                                    </View>
                                    <Text style={styles.toggleLabel}>Off-grid</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.addRouteConfirmBtn}
                                    activeOpacity={0.85}
                                    onPress={() => setScreenState('ROUTE_ACTIVE')}
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
                                    386 <Text style={styles.statUnit}>m</Text>
                                </Text>
                                <Text style={styles.statLabel}>Distance</Text>
                            </View>

                            <View style={styles.statCol}>
                                <Text style={styles.statValue}>
                                    6<Text style={styles.statUnit}>m</Text>
                                </Text>
                                <Text style={styles.statLabel}>Est. time</Text>
                            </View>

                            <View style={styles.statCol}>
                                <Text style={styles.statValue}>
                                    0 <Text style={styles.statUnit}>m</Text>
                                </Text>
                                <Text style={styles.statLabel}>Elev. gain</Text>
                            </View>

                            <View style={styles.statCol}>
                                <Text style={styles.statValue}>
                                    0 <Text style={styles.statUnit}>m</Text>
                                </Text>
                                <Text style={styles.statLabel}>Elev. loss</Text>
                            </View>
                        </View>
                    )}
                </View>
            </SafeAreaView>

            <Modal visible={isSaveMenuOpen} transparent animationType="fade" onRequestClose={() => setIsSaveMenuOpen(false)}>
                <TouchableWithoutFeedback onPress={() => setIsSaveMenuOpen(false)}>
                    <View style={styles.modalOverlayTopRight}>
                        <View style={styles.popoverMenu}>
                            <TouchableOpacity
                                style={styles.popoverOptionBtn}
                                onPress={() => {
                                    setIsSaveMenuOpen(false);
                                    router.back();
                                }}
                            >
                                <Text style={styles.popoverOptionTextBold}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.popoverOptionBtn}
                                onPress={() => {
                                    setIsSaveMenuOpen(false);
                                    router.back();
                                }}
                            >
                                <Text style={styles.popoverOptionText}>Navigate without saving</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

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
        flex: 1,
        justifyContent: 'space-between',
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 12 : 0,
    },
    topLeftGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    topRightGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    saveRouteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4D6B18',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 24,
        gap: 8,
    },
    saveRouteBtnText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#FFFFFF',
    },
    circleBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 4,
    },
    rightFloatCol: {
        position: 'absolute',
        right: 16,
        top: 140,
        gap: 12,
    },
    bottomLeftFloat: {
        position: 'absolute',
        left: 16,
        bottom: 180,
    },
    redPinMarker: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    waypointBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    waypointBadgeText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 12,
        color: '#FFFFFF',
    },
    bottomSheetContainer: {
        width: SCREEN_WIDTH,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 32 : 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    handleBar: {
        width: 38,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#CBD5E1',
        alignSelf: 'center',
        marginBottom: 16,
    },
    sheetTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#0F172A',
        marginBottom: 20,
    },
    inputsWrapper: {
        position: 'relative',
        gap: 12,
    },
    verticalConnector: {
        position: 'absolute',
        top: 26,
        left: 22,
        width: 2,
        height: 38,
        backgroundColor: '#CBD5E1',
        borderStyle: 'dashed',
        zIndex: 1,
    },
    inputRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 12,
        height: 54,
        zIndex: 2,
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
    },
    inputField: {
        flex: 1,
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#0F172A',
    },
    inputFieldPlaceholder: {
        color: '#855B32',
    },
    pinSelectedContent: {
        gap: 16,
    },
    pinHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    closeCardBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pinActionButtonsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    pinPrimaryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F2EE',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 24,
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
    },
    pinBtnText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#0F172A',
    },
    waypointPanelContent: {
        gap: 16,
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
    },
    waypointDistance: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#64748B',
        marginTop: 2,
    },
    waypointAddress: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 13,
        color: '#94A3B8',
        marginTop: 4,
        maxWidth: 280,
    },
    radioOptionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 8,
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
        borderWidth: 2,
        borderColor: '#94A3B8',
    },
    radioCircleSelected: {
        borderColor: '#4D6B18',
        borderWidth: 6,
    },
    radioLabel: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#0F172A',
    },
    waypointFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    offGridToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    toggleTrack: {
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#CBD5E1',
        padding: 2,
    },
    toggleTrackActive: {
        backgroundColor: '#4D6B18',
    },
    toggleThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
    },
    toggleThumbActive: {
        transform: [{ translateX: 20 }],
    },
    toggleLabel: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#0F172A',
    },
    addRouteConfirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4D6B18',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8,
    },
    addRouteConfirmText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#FFFFFF',
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 8,
    },
    statCol: {
        alignItems: 'center',
    },
    statValue: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 22,
        color: '#0F172A',
    },
    statUnit: {
        fontSize: 14,
        fontFamily: 'GoogleSans-Regular',
        color: '#64748B',
    },
    statLabel: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
    },
    modalOverlayTopRight: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.2)',
        alignItems: 'flex-end',
        paddingTop: 80,
        paddingRight: 16,
    },
    modalOverlayBottomLeft: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.2)',
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        paddingBottom: 240,
        paddingLeft: 16,
    },
    popoverMenu: {
        width: 220,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    popoverOptionBtn: {
        paddingHorizontal: 20,
        paddingVertical: 14,
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
    },
    popoverOptionText: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 15,
        color: '#334155',
    },
});