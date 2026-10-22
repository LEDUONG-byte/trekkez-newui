import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Dimensions,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

let MapView: any = null;
let Marker: any = null;
let PROVIDER_DEFAULT: any = null;

if (Platform.OS !== 'web') {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface Waypoint {
    id: string;
    label: 'A' | 'B' | string;
    text: string;
    badgeColor: string;
    isCurrentLocation?: boolean;
}

export default function MakeARouteScreen() {
    const router = useRouter();

    const [startLocation, setStartLocation] = useState('Current location');
    const [destination, setDestination] = useState('');

    const [region] = useState({
        latitude: 10.776889,
        longitude: 106.700806,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
    });

    return (
        <View style={styles.container}>
            {/* --- 1. MAP BACKGROUND --- */}
            {Platform.OS !== 'web' && MapView ? (
                <MapView
                    provider={PROVIDER_DEFAULT}
                    style={StyleSheet.absoluteFill}
                    initialRegion={region}
                    showsUserLocation
                    showsMyLocationButton={false}
                    showsCompass={false}
                >
                    <Marker
                        coordinate={{
                            latitude: region.latitude,
                            longitude: region.longitude,
                        }}
                        title="Current Location"
                    />
                </MapView>
            ) : (
                <View style={[StyleSheet.absoluteFill, styles.webMapFallback]}>
                    <Octicons name="location" size={48} color="#94A3B8" />
                    <Text style={styles.webMapText}>Map preview is optimized for Mobile devices</Text>
                </View>
            )}

            <SafeAreaView style={styles.overlayContainer} pointerEvents="box-none">
                {/* --- 2. TOP FLOATING CONTROLS --- */}
                <View style={styles.topRow}>
                    <View style={styles.topLeftGroup}>
                        <TouchableOpacity style={styles.circleBtn} activeOpacity={0.8}>
                            <Octicons name="gear" size={20} color="#0F172A" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.circleBtn} activeOpacity={0.8}>
                            <Octicons name="person" size={20} color="#EA580C" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.circleBtn}
                        activeOpacity={0.8}
                        onPress={() => router.back()}
                    >
                        <Octicons name="x" size={22} color="#0F172A" />
                    </TouchableOpacity>
                </View>

                {/* --- 3. RIGHT FLOATING BUTTONS --- */}
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

                {/* --- 4. BOTTOM-LEFT FLOATING BUTTON --- */}
                <View style={styles.bottomLeftFloat}>
                    <TouchableOpacity style={styles.circleBtn} activeOpacity={0.8}>
                        <Octicons name="kebab-horizontal" size={20} color="#0F172A" />
                    </TouchableOpacity>
                </View>

                {/* --- 5. BOTTOM SHEET PANEL --- */}
                <View style={styles.bottomSheetContainer}>
                    <View style={styles.handleBar} />

                    <Text style={styles.sheetTitle}>
                        Tap the map or search a place to start planning
                    </Text>

                    <View style={styles.inputsWrapper}>
                        <View style={styles.verticalConnector} />

                        {/* ĐIỂM A */}
                        <View style={styles.inputRowContainer}>
                            <View style={[styles.badgeCircle, { backgroundColor: '#48752C' }]}>
                                <Text style={styles.badgeText}>A</Text>
                            </View>

                            <TextInput
                                style={styles.inputField}
                                value={startLocation}
                                onChangeText={setStartLocation}
                                placeholder="Start location"
                                placeholderTextColor="#94A3B8"
                            />

                            <TouchableOpacity style={styles.iconActionBtn} activeOpacity={0.6}>
                                <Octicons name="three-bars" size={16} color="#94A3B8" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.iconActionBtn}
                                activeOpacity={0.6}
                                onPress={() => setStartLocation('')}
                            >
                                <Octicons name="x" size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {/* ĐIỂM B */}
                        <View style={styles.inputRowContainer}>
                            <View style={[styles.badgeCircle, { backgroundColor: '#C85213' }]}>
                                <Text style={styles.badgeText}>B</Text>
                            </View>

                            <TextInput
                                style={[styles.inputField, !destination && styles.inputFieldPlaceholder]}
                                value={destination}
                                onChangeText={setDestination}
                                placeholder="Enter Destination"
                                placeholderTextColor="#855B32"
                            />
                        </View>
                    </View>
                </View>
            </SafeAreaView>
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
        bottom: 240,
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
        backgroundColor: '#94A3B8',
        alignSelf: 'center',
        marginBottom: 16,
    },
    sheetTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#0F172A',
        marginBottom: 20,
        includeFontPadding: false,
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
        paddingHorizontal: 8,
        paddingVertical: 6,
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
        marginLeft: 2,
    },
    badgeText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#FFFFFF',
        includeFontPadding: false,
    },
    inputField: {
        flex: 1,
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#0F172A',
        paddingVertical: 0,
        includeFontPadding: false,
    },
    inputFieldPlaceholder: {
        fontFamily: 'GoogleSans-Bold',
        color: '#855B32',
    },
    iconActionBtn: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
});