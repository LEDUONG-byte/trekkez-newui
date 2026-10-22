import React, { useState, useEffect } from 'react';
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

// Khởi tạo Mapbox an toàn để không crash trên nền tảng Web
let Mapbox: any = null;
const MAPBOX_KEY = process.env.EXPO_PUBLIC_MAPBOX_KEY;

if (Platform.OS !== 'web') {
    Mapbox = require('@rnmapbox/maps').default;
    if (MAPBOX_KEY) {
        Mapbox.setAccessToken(MAPBOX_KEY);
    }
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

    const [screenState, setScreenState] = useState<ScreenState>('INITIAL');
    const [startLocation, setStartLocation] = useState('Current location');
    const [destination, setDestination] = useState('');
    const [waypointMode, setWaypointMode] = useState<'along' | 'end'>('along');
    const [isOffGrid, setIsOffGrid] = useState(false);

    const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

    const [selectedPin, setSelectedPin] = useState<{ latitude: number; longitude: number } | null>(null);

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

        // Mapbox trả về GeoJSON Feature khi nhấn vào bản đồ
        const coords = e?.geometry?.coordinates;
        if (coords) {
            // Cấu trúc mảng của Mapbox luôn là: [longitude, latitude]
            setSelectedPin({ longitude: coords[0], latitude: coords[1] });
        } else {
            // Tọa độ dự phòng nếu lỗi
            setSelectedPin({ latitude: 10.8218, longitude: 106.6885 });
        }
        setScreenState('PIN_SELECTED');
    };

    const handleSetStartPoint = () => {
        setStartLocation('565 Lê Quang Định, Hạnh Thông');
        setSelectedPin(null);
        if (destination) {
            setScreenState('ROUTE_ACTIVE');
        } else {
            setScreenState('INITIAL');
        }
    };

    const handleSetDestination = () => {
        setDestination('Phạm Văn Đồng, Gò Vấp');
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
            {Platform.OS !== 'web' && Mapbox ? (
                <Mapbox.MapView
                    style={StyleSheet.absoluteFill}
                    styleURL={Mapbox.StyleURL.Outdoors} // Lớp bản đồ Mapbox Outdoors
                    onPress={handleMapPress}
                    logoEnabled={false}
                    attributionEnabled={false}
                    compassEnabled={false}
                >
                    <Mapbox.Camera
                        zoomLevel={14}
                        centerCoordinate={[106.6882, 10.8225]} // [longitude, latitude]
                    />

                    <Mapbox.UserLocation visible={true} />

                    {/* Hiển thị ghim khi chọn */}
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

                    {/* Hiển thị đường đi và các điểm Waypoints */}
                    {screenState === 'ROUTE_ACTIVE' && (
                        <>
                            <Mapbox.ShapeSource
                                id="routeSource"
                                shape={{
                                    type: 'LineString',
                                    coordinates: routeCoordinates.map(pt => [pt.longitude, pt.latitude]),
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
            ) : (
                <TouchableOpacity
                    activeOpacity={1}
                    style={[StyleSheet.absoluteFill, styles.webMapFallback]}
                    onPress={handleMapPress}
                >
                    <Octicons name="location" size={48} color="#94A3B8" />
                    <Text style={styles.webMapText}>Mapbox Key connected. Tap anywhere to simulate pin selection.</Text>
                </TouchableOpacity>
            )}

            <SafeAreaView style={styles.overlayContainer} pointerEvents="box-none">
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

                <View style={styles.rightFloatCol}>
                    <TouchableOpacity style={styles.circleBtn} activeOpacity={0.8}>
                        <Octicons name="search" size={20} color="#0F172A" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.circleBtn} activeOpacity={0.8}>
                        <Octicons name="location" size={20} color="#0F172A" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.circleBtn} activeOpacity={0.8}>
                        <Octicons name="stack" size={20} color="#0F172A" />
                    </TouchableOpacity>
                </View>

                <View style={styles.bottomLeftFloat}>
                    <TouchableOpacity
                        style={styles.circleBtn}
                        activeOpacity={0.8}
                        onPress={() => setIsMoreMenuOpen(true)}
                    >
                        <Octicons name="kebab-horizontal" size={20} color="#0F172A" />
                    </TouchableOpacity>
                </View>

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
                                        📍 565 Lê Quang Định, Hạnh Thông, Hồ Chí Minh
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
    webMapFallback: {
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    webMapText: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 14,
        color: '#64748B',
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