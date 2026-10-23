import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    TouchableOpacityProps,
    TextInput,
    Platform,
    Modal,
    TouchableWithoutFeedback,
    ActivityIndicator,
    KeyboardAvoidingView,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import RouteMapWeb from '../components/RouteMapWeb';
import * as Location from 'expo-location';
import { saveRemoteRoute } from '../api/services/route/route-write';

// Native Mapbox remains unchanged; the Web map uses mapbox-gl directly.
const Mapbox: any = Platform.OS === 'web' ? null : require('@rnmapbox/maps').default;

const MAPBOX_KEY = process.env.EXPO_PUBLIC_MAPBOX_KEY;
if (MAPBOX_KEY && Mapbox) {
    Mapbox.setAccessToken(MAPBOX_KEY);
}

const validLngLat = (value: unknown): value is [number, number] =>
    Array.isArray(value) && value.length >= 2 &&
    Number.isFinite(value[0]) && Number.isFinite(value[1]) &&
    Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;


// =====================================================================
// COMPONENT: PrimaryButton
// =====================================================================
interface PrimaryButtonProps extends TouchableOpacityProps {
    title: string;
}

function PrimaryButton({ title, style, disabled, ...props }: PrimaryButtonProps) {
    return (
        <TouchableOpacity
            style={[styles.continueBtn, disabled && styles.continueBtnDisabled, style]}
            activeOpacity={0.8}
            disabled={disabled}
            {...props}
        >
            <Text style={styles.continueText}>{title}</Text>
        </TouchableOpacity>
    );
}

type ScreenState = 'INITIAL' | 'PIN_SELECTED' | 'WAYPOINT_PANEL' | 'ROUTE_ACTIVE';

interface WaypointItem {
    id: string;
    coordinate: [number, number];
    label: string;
}

export default function MakeARouteScreen() {
    const router = useRouter();
    const cameraRef = useRef<any>(null);
    const insets = useSafeAreaInsets();

    const [screenState, setScreenState] = useState<ScreenState>('INITIAL');
    const [startLocationText, setStartLocationText] = useState('Current location');
    const [destinationText, setDestinationText] = useState('');
    const [waypointMode, setWaypointMode] = useState<'along' | 'end'>('along');
    const [isOffGrid, setIsOffGrid] = useState(false);
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

    // Save & More Modal States
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [savePending, setSavePending] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchPending, setSearchPending] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [searchResults, setSearchResults] = useState<Array<{label:string; coordinate:[number,number]}>>([]);
    const [routeNameInput, setRouteNameInput] = useState('My new route');
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

    const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
    const [selectedPin, setSelectedPin] = useState<[number, number] | null>(null);

    const [currentZoom, setCurrentZoom] = useState<number>(16);
    const [centerLat, setCenterLat] = useState<number>(10.8225);

    const [startPoint, setStartPoint] = useState<WaypointItem | null>(null);
    const [destinationPoint, setDestinationPoint] = useState<WaypointItem | null>(null);
    const [waypointsList, setWaypointsList] = useState<WaypointItem[]>([]);

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
        if (typeof zoom === 'number' && Number.isFinite(zoom)) {
            setCurrentZoom(zoom);
        }
        if (validLngLat(center)) {
            setCenterLat(center[1]);
        }
    };

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            try {
                let location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });
                const coords: [number, number] = [location.coords.longitude, location.coords.latitude];
                if (!validLngLat(coords)) return;
                setUserCoords(coords);
                setCenterLat(location.coords.latitude);

                setStartPoint({
                    id: 'point-a',
                    coordinate: coords,
                    label: 'A',
                });

                if (cameraRef.current) {
                    cameraRef.current.setCamera({
                        centerCoordinate: coords,
                        zoomLevel: 16,
                        animationDuration: 1000,
                    });
                }
            } catch (error) {
                console.log('GPS Error:', error);
            }
        })();
    }, []);

    const generateRoute = async (
        start: [number, number],
        end: [number, number],
        waypoints: WaypointItem[] = []
    ) => {
        if (![start, end, ...waypoints.map((w) => w.coordinate)].every(validLngLat)) {
            Alert.alert('Invalid route', 'Tọa độ Route không hợp lệ.');
            return;
        }
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
                const geometry: unknown = primaryRoute?.geometry?.coordinates;
                if (!Array.isArray(geometry) || !geometry.every(validLngLat)) {
                    throw new Error('Mapbox trả về tọa độ tuyến không hợp lệ');
                }
                setRouteGeometry(geometry);
                setRouteStats({
                    distance: Math.round(primaryRoute.distance),
                    duration: Math.max(1, Math.round(primaryRoute.duration / 60)),
                    elevGain: 0,
                    elevLoss: 0,
                });
            } else {
                setRouteGeometry([start, ...waypoints.map((w) => w.coordinate), end]);
            }

            if (cameraRef.current) {
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
        if (!validLngLat(coords)) return;
        const clickedLngLat: [number, number] = coords;

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

        generateRoute(effectiveStart, newEnd.coordinate, waypointsList);
    };

    const handleAddWaypoint = () => {
        if (!selectedPin || !startPoint || !destinationPoint) return;

        const newWaypoint: WaypointItem = {
            id: `wp-${Date.now()}`,
            coordinate: selectedPin,
            label: `${waypointsList.length + 1}`,
        };

        const updatedWaypoints = [...waypointsList, newWaypoint];
        setWaypointsList(updatedWaypoints);
        generateRoute(startPoint.coordinate, destinationPoint.coordinate, updatedWaypoints);
    };

    const handleResetRoute = () => {
        setStartLocationText('Current location');
        setDestinationText('');
        setDestinationPoint(null);
        setWaypointsList([]);
        setRouteGeometry([]);
        setSelectedPin(null);
        setScreenState('INITIAL');
        setIsMoreMenuOpen(false);

        if (userCoords) {
            setStartPoint({
                id: 'point-a',
                coordinate: userCoords,
                label: 'A',
            });
            if (cameraRef.current) {
                cameraRef.current.setCamera({
                    centerCoordinate: userCoords,
                    zoomLevel: 16,
                    animationDuration: 800,
                });
            }
        }
    };

    const handleCenterOnUser = async () => {
        try {
            let location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            const coords: [number, number] = [location.coords.longitude, location.coords.latitude];
            if (!validLngLat(coords)) return;
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

    const searchPlaces = async () => {
        if (!searchQuery.trim()) {setSearchError('Nhập địa điểm cần tìm.');return;}
        if (!MAPBOX_KEY) {setSearchError('Thiếu EXPO_PUBLIC_MAPBOX_KEY.');return;}
        setSearchPending(true);setSearchError('');
        try {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery.trim())}.json?limit=6&language=vi&access_token=${encodeURIComponent(MAPBOX_KEY)}`;
            const response = await fetch(url);
            const data = await response.json();
            if(!response.ok)throw new Error(data?.message || `Mapbox HTTP ${response.status}`);
            const results = (Array.isArray(data?.features) ? data.features : [])
                .filter((f:any)=>validLngLat(f.center))
                .map((f:any)=>({label:String(f.place_name || f.text || 'Location'),coordinate:f.center as [number,number]}));
            setSearchResults(results);
            if(!results.length)setSearchError('Không tìm thấy địa điểm.');
        }catch(error){setSearchError(error instanceof Error?error.message:String(error));}
        finally{setSearchPending(false);}
    };
    const chooseSearchResult = (result:{label:string;coordinate:[number,number]}) => {
        setSelectedPin(result.coordinate);
        setCenterLat(result.coordinate[1]);
        setSearchOpen(false);
        setScreenState(screenState==='ROUTE_ACTIVE'?'WAYPOINT_PANEL':'PIN_SELECTED');
        cameraRef.current?.setCamera?.({centerCoordinate:result.coordinate,zoomLevel:15,animationDuration:650});
    };
    const newRouteId = ():string => {
        const arr=new Uint8Array(16);
        if(typeof crypto !== 'undefined' && typeof crypto.getRandomValues==='function') crypto.getRandomValues(arr);
        else for(let i=0;i<16;i++)arr[i]=Math.floor(Math.random()*256);
        arr[6]=(arr[6]&15)|64;arr[8]=(arr[8]&63)|128;
        const h=Array.from(arr,x=>x.toString(16).padStart(2,'0')).join('');
        return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
    };
    const showRouteMessage = (message:string) => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(message);
        else Alert.alert('TrekkEZ Route',message);
    };
    const handleConfirmSaveRoute = async () => {
        if(savePending)return;
        if(!startPoint||!destinationPoint||routeGeometry.length<2){
            showRouteMessage('Cần chọn A và B để tạo tuyến đường trước khi lưu.');return;
        }
        setSavePending(true);
        try {
            await saveRemoteRoute({
                id:newRouteId(),name:routeNameInput.trim(),start:startPoint.coordinate,
                destination:destinationPoint.coordinate,stops:waypointsList.map(w=>w.coordinate),
                geometry:routeGeometry,distanceMeters:routeStats.distance,durationSeconds:routeStats.duration*60,
            });
            setIsSaveModalOpen(false);
            showRouteMessage('Route đã được Supabase xác nhận lưu thành công.');
            router.back();
        }catch(error){showRouteMessage(error instanceof Error?error.message:String(error));}
        finally{setSavePending(false);}
    };

    return (
        <View style={styles.container}>
            {Platform.OS === 'web' ? (
                <RouteMapWeb
                    accessToken={MAPBOX_KEY || ''}
                    cameraRef={cameraRef}
                    onMapPress={handleMapPress}
                    onCameraChanged={handleCameraChanged}
                    centerCoordinate={validLngLat(userCoords) ? userCoords : [106.6882, 10.8225]}
                    startPoint={startPoint}
                    destinationPoint={destinationPoint}
                    selectedPin={selectedPin}
                    waypoints={waypointsList}
                    routeGeometry={routeGeometry}
                />
            ) : (
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
                    zoomLevel={16}
                    centerCoordinate={userCoords || [106.6882, 10.8225]}
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
            )}

            {isCalculatingRoute && (
                <View style={styles.calculatingOverlay}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.calculatingText}>Calculating route...</Text>
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

                    <View style={styles.topRightRow} pointerEvents="box-none">
                        <TouchableOpacity
                            style={styles.circleBtn}
                            activeOpacity={0.8}
                            onPress={() => { setSearchResults([]); setSearchError(''); setSearchOpen(true); }}
                        >
                            <Octicons name="search" size={20} color="#0F172A" />
                        </TouchableOpacity>

                        {screenState === 'ROUTE_ACTIVE' && (
                            <TouchableOpacity
                                style={styles.saveRouteBtn}
                                activeOpacity={0.85}
                                onPress={() => setIsSaveModalOpen(true)}
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

                    {/* Card nổi */}
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

                                    {/* Ô nhập điểm A */}
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

                                    {/* Ô nhập điểm B */}
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
                </View>
            </View>

            {/* ================= MODAL TRƯỢT LÊN LƯU LỘ TRÌNH ================= */}
            <Modal transparent visible={searchOpen} animationType="fade" onRequestClose={()=>setSearchOpen(false)}>
                <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1,justifyContent:'center',padding:20,backgroundColor:'rgba(15,23,42,.55)'}}>
                    <View style={{backgroundColor:'#FFFFFF',padding:18,borderRadius:16,maxHeight:'75%'}}>
                        <Text style={{fontWeight:'700',fontSize:18,marginBottom:12}}>Search a place</Text>
                        <TextInput autoFocus placeholder="Tên địa điểm..." value={searchQuery} onChangeText={setSearchQuery}
                            onSubmitEditing={()=>{void searchPlaces();}} style={{borderWidth:1,borderColor:'#CBD5E1',borderRadius:12,padding:12}} />
                        <TouchableOpacity onPress={()=>{void searchPlaces();}} disabled={searchPending} style={{backgroundColor:'#83CFFE',padding:14,borderRadius:12,marginTop:10,alignItems:'center'}}>
                            <Text>{searchPending?'Searching...':'Search'}</Text>
                        </TouchableOpacity>
                        {searchError?<Text style={{color:'#B91C1C',marginVertical:8}}>{searchError}</Text>:null}
                        {searchResults.map((result,i)=><TouchableOpacity key={i} onPress={()=>chooseSearchResult(result)} style={{padding:10,borderBottomWidth:1,borderColor:'#E2E8F0'}}>
                            <Text>{result.label}</Text>
                        </TouchableOpacity>)}
                        <TouchableOpacity onPress={()=>setSearchOpen(false)} style={{padding:10,alignItems:'center'}}><Text>Close</Text></TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
            <Modal
                visible={isSaveModalOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setIsSaveModalOpen(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.saveModalBackdrop}
                >
                    <TouchableWithoutFeedback onPress={() => setIsSaveModalOpen(false)}>
                        <View style={styles.saveModalDismissOverlay} />
                    </TouchableWithoutFeedback>

                    <View style={[styles.saveModalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                        <View style={styles.saveModalHeader}>
                            <Text style={styles.saveModalTitle}>Save your route</Text>
                            {/* Dấu X không bọc tròn */}
                            <TouchableOpacity
                                style={styles.saveModalCloseBtn}
                                activeOpacity={0.7}
                                onPress={() => setIsSaveModalOpen(false)}
                            >
                                <Octicons name="x" size={22} color="#0F172A" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.saveModalSubtitle}>
                            Give your custom route a memorable name to easily access it later.
                        </Text>

                        <View style={styles.saveModalInputWrapper}>
                            <TextInput
                                style={styles.saveModalInput}
                                value={routeNameInput}
                                onChangeText={setRouteNameInput}
                                placeholder="Enter route name"
                                placeholderTextColor="#94A3B8"
                                autoFocus
                            />
                            {routeNameInput.length > 0 && (
                                <TouchableOpacity
                                    style={styles.clearBtn}
                                    onPress={() => setRouteNameInput('')}
                                >
                                    <Octicons name="x" size={16} color="#64748B" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.saveModalButtonContainer}>
                            <PrimaryButton
                                title="Save"
                                disabled={!routeNameInput.trim()}
                                onPress={handleConfirmSaveRoute}
                            />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ================= MODAL MORE OPTIONS (...) ================= */}
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

    // Khối đáy
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

    // Card nổi phẳng màu nền #f5f4f7
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

    // Khi chọn điểm trên bản đồ
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

    // Waypoint Panel
    waypointPanelContent: {
        gap: 14,
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
        justifyContent: 'space-between',
        marginTop: 4,
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
        backgroundColor: '#207bfb',
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
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    addRouteConfirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#42444b',
        paddingHorizontal: 20,
        paddingVertical: 12,
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

    // Active Route Stats
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

    // Save Modal Styles
    saveModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'flex-end',
    },
    saveModalDismissOverlay: {
        flex: 1,
    },
    saveModalSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 24,
        gap: 16,
    },
    saveModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    saveModalTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 20,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    // Dấu X đóng modal không bọc tròn
    saveModalCloseBtn: {
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveModalSubtitle: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 14,
        color: '#64748B',
        lineHeight: 20,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    saveModalInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 54,
    },
    saveModalInput: {
        flex: 1,
        fontFamily: 'GoogleSans-Medium',
        fontSize: 15,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
        paddingVertical: 0,
    },
    saveModalButtonContainer: {
        marginTop: 8,
        width: '100%',
    },

    // Component PrimaryButton
    continueBtn: {
        backgroundColor: '#1E293B',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    continueBtnDisabled: {
        opacity: 0.5,
    },
    continueText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },

    // Modal ba chấm
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
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    popoverOptionText: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 15,
        color: '#334155',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
});