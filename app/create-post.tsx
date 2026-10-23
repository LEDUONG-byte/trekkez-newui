import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    FlatList,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Modal,
    Image,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Octicons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library/legacy';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';

import PrimaryButton from '../components/PrimaryButton';
import CustomAlert from '../components/CustomAlert';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMB_SIZE = 76;
const THUMB_GAP = 12;

type Step = 'SELECT' | 'EDIT' | 'DETAILS';

interface FilterOption {
    id: string;
    name: string;
    overlayColor: string;
    opacity: number;
}

interface AlertState {
    visible: boolean;
    title: string;
    content: string;
    buttonText: string;
    onClose: () => void;
}

const FILTER_PRESETS: FilterOption[] = [
    { id: 'normal', name: 'Normal', overlayColor: 'transparent', opacity: 0 },
    { id: 'warm', name: 'Warm', overlayColor: '#F59E0B', opacity: 0.15 },
    { id: 'cool', name: 'Cool', overlayColor: '#0284C7', opacity: 0.15 },
    { id: 'vivid', name: 'Vivid', overlayColor: '#EC4899', opacity: 0.12 },
    { id: 'bw', name: 'B&W', overlayColor: '#000000', opacity: 0.35 },
];

const SUGGESTED_LOCATIONS = [
    'Ho Chi Minh City, Vietnam',
    'Da Lat, Lam Dong',
    'Ta Nang - Phan Dung',
    'Fansipan Summit',
];

export default function CreatePostScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [currentStep, setCurrentStep] = useState<Step>('SELECT');
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

    // Media Library States
    const [libraryPhotos, setLibraryPhotos] = useState<MediaLibrary.Asset[]>([]);
    const [hasNextPage, setHasNextPage] = useState<boolean>(true);
    const [afterCursor, setAfterCursor] = useState<string | undefined>(undefined);
    const [isLoadingPhotos, setIsLoadingPhotos] = useState<boolean>(false);
    const loadingRef = useRef<boolean>(false);

    // Custom Alert State
    const [alertConfig, setAlertConfig] = useState<AlertState>({
        visible: false,
        title: '',
        content: '',
        buttonText: 'OK',
        onClose: () => {},
    });

    const showAlert = (
        title: string,
        content: string,
        buttonText = 'OK',
        onClose?: () => void
    ) => {
        setAlertConfig({
            visible: true,
            title,
            content,
            buttonText,
            onClose: () => {
                setAlertConfig((prev) => ({ ...prev, visible: false }));
                if (onClose) onClose();
            },
        });
    };

    // Camera State
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
    const [facing, setFacing] = useState<CameraType>('back');
    const cameraRef = useRef<CameraView>(null);

    // Edit State
    const [selectedFilter, setSelectedFilter] = useState<string>('normal');

    // Details State
    const [caption, setCaption] = useState<string>('');
    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [isPublic, setIsPublic] = useState<boolean>(true);

    // Load ảnh từ thiết bị
    const loadDevicePhotos = useCallback(async (reset = false) => {
        if (loadingRef.current) return;
        if (!reset && !hasNextPage) return;

        try {
            loadingRef.current = true;
            setIsLoadingPhotos(true);

            // Xin quyền đọc thư viện (false = xin quyền READ chứ không chỉ WRITE)
            const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync(false);
            let finalStatus = status;

            if (status !== 'granted') {
                const req = await MediaLibrary.requestPermissionsAsync(false);
                finalStatus = req.status;
            }

            if (finalStatus !== 'granted') {
                if (!canAskAgain) {
                    showAlert('Permission Required', 'Please enable media library access in app settings to view photos.');
                }
                return;
            }

            const assets = await MediaLibrary.getAssetsAsync({
                first: 40,
                after: reset ? undefined : afterCursor,
                mediaType: [MediaLibrary.MediaType.photo],
                sortBy: [MediaLibrary.SortBy.creationTime],
            });

            if (reset) {
                setLibraryPhotos(assets.assets);
                if (assets.assets.length > 0 && selectedImages.length === 0) {
                    setSelectedImages([assets.assets[0].uri]);
                    setActiveImageIndex(0);
                }
            } else {
                setLibraryPhotos((prev) => [...prev, ...assets.assets]);
            }

            setHasNextPage(assets.hasNextPage);
            setAfterCursor(assets.endCursor);
        } catch (error) {
            console.error('Error loading media assets:', error);
            showAlert('Notice', 'Cannot load device photos directly. You can use Open Gallery.');
        } finally {
            loadingRef.current = false;
            setIsLoadingPhotos(false);
        }
    }, [hasNextPage, afterCursor, selectedImages.length]);

    useEffect(() => {
        loadDevicePhotos(true);
    }, []);

    const handlePickFromLibrary = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                showAlert('Permission Denied', 'Media library access is needed to select photos.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: true,
                selectionLimit: 10,
                quality: 0.85,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const uris = result.assets.map((asset) => asset.uri);
                setSelectedImages((prev) => Array.from(new Set([...uris, ...prev])));
                setActiveImageIndex(0);
            }
        } catch {
            showAlert('Error', 'Image picker native module is not linked. Please rebuild your app.');
        }
    };

    const handleToggleSelectPhoto = (uri: string) => {
        if (selectedImages.includes(uri)) {
            const index = selectedImages.indexOf(uri);
            if (selectedImages.length === 1) {
                setSelectedImages([]);
                setActiveImageIndex(0);
                return;
            }
            const updated = selectedImages.filter((u) => u !== uri);
            setSelectedImages(updated);
            if (activeImageIndex >= updated.length) {
                setActiveImageIndex(Math.max(0, updated.length - 1));
            } else if (activeImageIndex === index) {
                setActiveImageIndex(0);
            }
        } else {
            if (selectedImages.length >= 10) {
                showAlert('Limit Reached', 'You can select up to 10 photos per post.');
                return;
            }
            setSelectedImages((prev) => [...prev, uri]);
            setActiveImageIndex(selectedImages.length);
        }
    };

    const handleOpenCamera = async () => {
        if (!cameraPermission?.granted) {
            const res = await requestCameraPermission();
            if (!res.granted) {
                showAlert('Permission Denied', 'Camera permission is required to capture photos.');
                return;
            }
        }
        setIsCameraActive(true);
    };

    const handleCapturePhoto = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
                if (photo?.uri) {
                    setSelectedImages((prev) => [photo.uri, ...prev]);
                    setActiveImageIndex(0);
                    setIsCameraActive(false);
                }
            } catch {
                showAlert('Error', 'Failed to take photo. Please try again.');
            }
        }
    };

    const handleNext = () => {
        if (selectedImages.length === 0) {
            showAlert('Notice', 'Please select or capture at least one photo first.');
            return;
        }

        if (currentStep === 'SELECT') {
            setCurrentStep('EDIT');
        } else if (currentStep === 'EDIT') {
            setCurrentStep('DETAILS');
        }
    };

    const handleBack = () => {
        if (currentStep === 'DETAILS') {
            setCurrentStep('EDIT');
        } else if (currentStep === 'EDIT') {
            setCurrentStep('SELECT');
        } else {
            router.back();
        }
    };

    const handleSharePost = () => {
        showAlert('Published', 'Your post has been successfully shared!', 'OK', () => {
            router.back();
        });
    };

    const getHeaderTitle = () => {
        switch (currentStep) {
            case 'SELECT':
                return 'NEW POST';
            case 'EDIT':
                return 'EDIT PHOTO';
            case 'DETAILS':
                return 'POST DETAILS';
            default:
                return 'NEW POST';
        }
    };

    const currentFilterObj = FILTER_PRESETS.find((f) => f.id === selectedFilter) || FILTER_PRESETS[0];

    const currentPreviewUri = selectedImages.length > 0 && selectedImages[activeImageIndex]
        ? selectedImages[activeImageIndex]
        : libraryPhotos[0]?.uri;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <View style={styles.headerBar}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={handleBack}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Octicons name="chevron-left" size={24} color="#0F172A" />
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>

                    <View style={styles.placeholderRight} />
                </View>
            </View>

            {/* Step 1: Select Media */}
            {currentStep === 'SELECT' && (
                <View style={styles.stepContainer}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepScrollContent}>
                        {/* Main Image Preview */}
                        <View style={styles.mainPreviewContainer}>
                            {currentPreviewUri ? (
                                <Image
                                    source={{ uri: currentPreviewUri }}
                                    style={styles.mainPreviewImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <TouchableOpacity
                                    style={styles.emptyPreviewBox}
                                    activeOpacity={0.8}
                                    onPress={handlePickFromLibrary}
                                >
                                    <Ionicons name="images-outline" size={48} color="#94A3B8" />
                                    <Text style={styles.emptyPromptTitle}>No photo selected</Text>
                                    <Text style={styles.emptyPromptSubtitle}>Tap to choose photos from device</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Bar thông tin & nút mở Thư viện */}
                        <View style={styles.galleryActionBar}>
                            <View style={styles.galleryRecentsHeader}>
                                <Text style={styles.galleryTitle}>Recents</Text>
                                {selectedImages.length > 0 && (
                                    <View style={styles.selectedCountBadge}>
                                        <Text style={styles.selectedCountText}>{selectedImages.length}/10</Text>
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity
                                style={styles.openPickerBtn}
                                activeOpacity={0.8}
                                onPress={handlePickFromLibrary}
                            >
                                <Octicons name="stack" size={15} color="#0F172A" />
                                <Text style={styles.openPickerText}>Open Gallery</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Hàng chọn ảnh: Camera + Danh sách ảnh */}
                        <View style={styles.gridContainer}>
                            <TouchableOpacity
                                style={styles.cameraTileBtn}
                                activeOpacity={0.8}
                                onPress={handleOpenCamera}
                            >
                                <Ionicons name="camera-outline" size={26} color="#0F172A" />
                                <Text style={styles.cameraTileText}>Camera</Text>
                            </TouchableOpacity>

                            <FlatList
                                data={libraryPhotos}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.thumbnailList}
                                keyExtractor={(item) => item.id}
                                initialNumToRender={8}
                                maxToRenderPerBatch={10}
                                windowSize={5}
                                removeClippedSubviews={Platform.OS === 'android'}
                                getItemLayout={(_, index) => ({
                                    length: THUMB_SIZE + THUMB_GAP,
                                    offset: (THUMB_SIZE + THUMB_GAP) * index,
                                    index,
                                })}
                                onEndReached={() => {
                                    if (libraryPhotos.length > 0 && !loadingRef.current && hasNextPage) {
                                        loadDevicePhotos();
                                    }
                                }}
                                onEndReachedThreshold={0.5}
                                ListFooterComponent={
                                    isLoadingPhotos ? (
                                        <View style={styles.thumbLoadingBox}>
                                            <ActivityIndicator size="small" color="#3B82F6" />
                                        </View>
                                    ) : null
                                }
                                renderItem={({ item }) => {
                                    const isSelected = selectedImages.includes(item.uri);
                                    const selectOrder = selectedImages.indexOf(item.uri) + 1;
                                    const isCurrentActive =
                                        selectedImages[activeImageIndex] === item.uri;

                                    return (
                                        <TouchableOpacity
                                            style={[
                                                styles.thumbnailWrapper,
                                                isSelected && styles.thumbnailSelected,
                                                isCurrentActive && styles.thumbnailActivePreview,
                                            ]}
                                            activeOpacity={0.8}
                                            onPress={() => {
                                                if (isSelected) {
                                                    setActiveImageIndex(selectedImages.indexOf(item.uri));
                                                } else {
                                                    handleToggleSelectPhoto(item.uri);
                                                }
                                            }}
                                        >
                                            <Image
                                                source={{ uri: item.uri }}
                                                style={styles.thumbnailImage}
                                                resizeMode="cover"
                                            />

                                            <TouchableOpacity
                                                style={[
                                                    styles.selectBadge,
                                                    isSelected && styles.selectBadgeActive,
                                                ]}
                                                onPress={() => handleToggleSelectPhoto(item.uri)}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                {isSelected ? (
                                                    <Text style={styles.selectBadgeNum}>{selectOrder}</Text>
                                                ) : (
                                                    <View style={styles.selectBadgeEmpty} />
                                                )}
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        </View>
                    </ScrollView>

                    {/* Nút Next nổi */}
                    <View style={[styles.bottomBarContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                        <PrimaryButton
                            title="Next"
                            onPress={handleNext}
                        />
                    </View>
                </View>
            )}

            {/* Step 2: Edit & Filters */}
            {currentStep === 'EDIT' && (
                <View style={styles.stepContainer}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepScrollContent}>
                        <View style={styles.editPreviewWrapper}>
                            <Image
                                source={{ uri: selectedImages[activeImageIndex] }}
                                style={styles.editPreviewImage}
                                resizeMode="cover"
                            />
                            {currentFilterObj.opacity > 0 && (
                                <View
                                    style={[
                                        StyleSheet.absoluteFill,
                                        {
                                            backgroundColor: currentFilterObj.overlayColor,
                                            opacity: currentFilterObj.opacity,
                                        },
                                    ]}
                                />
                            )}
                        </View>

                        <View style={styles.editControlsContainer}>
                            <Text style={styles.sectionSmallLabel}>Filters</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.filterList}
                            >
                                {FILTER_PRESETS.map((filter) => {
                                    const isFilterActive = selectedFilter === filter.id;
                                    return (
                                        <TouchableOpacity
                                            key={filter.id}
                                            style={styles.filterOptionItem}
                                            activeOpacity={0.8}
                                            onPress={() => setSelectedFilter(filter.id)}
                                        >
                                            <View
                                                style={[
                                                    styles.filterPreviewThumb,
                                                    isFilterActive && styles.filterPreviewThumbActive,
                                                ]}
                                            >
                                                <Image
                                                    source={{ uri: selectedImages[activeImageIndex] }}
                                                    style={styles.filterThumbImage}
                                                    resizeMode="cover"
                                                />
                                                {filter.opacity > 0 && (
                                                    <View
                                                        style={[
                                                            StyleSheet.absoluteFill,
                                                            {
                                                                backgroundColor: filter.overlayColor,
                                                                opacity: filter.opacity,
                                                            },
                                                        ]}
                                                    />
                                                )}
                                            </View>
                                            <Text
                                                style={[
                                                    styles.filterNameText,
                                                    isFilterActive && styles.filterNameTextActive,
                                                ]}
                                            >
                                                {filter.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </ScrollView>

                    {/* Nút Next nổi */}
                    <View style={[styles.bottomBarContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                        <PrimaryButton
                            title="Next"
                            onPress={handleNext}
                        />
                    </View>
                </View>
            )}

            {/* Step 3: Details */}
            {currentStep === 'DETAILS' && (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.flex1}
                >
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.detailsScrollContent}
                    >
                        <View style={styles.captionRowCard}>
                            <Image
                                source={{ uri: selectedImages[activeImageIndex] }}
                                style={styles.detailsThumbPreview}
                                resizeMode="cover"
                            />
                            <TextInput
                                style={styles.captionInput}
                                placeholder="Add a caption..."
                                placeholderTextColor="#94A3B8"
                                multiline
                                numberOfLines={4}
                                value={caption}
                                onChangeText={setCaption}
                            />
                        </View>

                        <View style={styles.sectionGroupCard}>
                            <View style={styles.fieldHeaderRow}>
                                <Octicons name="location" size={16} color="#0F172A" />
                                <Text style={styles.fieldHeaderTitle}>Add location</Text>
                            </View>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.locationPillsRow}
                            >
                                {SUGGESTED_LOCATIONS.map((loc) => {
                                    const isLocSelected = selectedLocation === loc;
                                    return (
                                        <TouchableOpacity
                                            key={loc}
                                            style={[
                                                styles.locationPill,
                                                isLocSelected && styles.locationPillActive,
                                            ]}
                                            activeOpacity={0.8}
                                            onPress={() =>
                                                setSelectedLocation(isLocSelected ? '' : loc)
                                            }
                                        >
                                            <Text
                                                style={[
                                                    styles.locationPillText,
                                                    isLocSelected && styles.locationPillTextActive,
                                                ]}
                                            >
                                                {loc}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        <View style={styles.sectionGroupCard}>
                            <View style={styles.fieldHeaderRow}>
                                <Octicons name="eye" size={16} color="#0F172A" />
                                <Text style={styles.fieldHeaderTitle}>Audience</Text>
                            </View>

                            <View style={styles.audienceOptionRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.audienceBtn,
                                        isPublic && styles.audienceBtnActive,
                                    ]}
                                    activeOpacity={0.8}
                                    onPress={() => setIsPublic(true)}
                                >
                                    <Text
                                        style={[
                                            styles.audienceBtnText,
                                            isPublic && styles.audienceBtnTextActive,
                                        ]}
                                    >
                                        Everyone
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.audienceBtn,
                                        !isPublic && styles.audienceBtnActive,
                                    ]}
                                    activeOpacity={0.8}
                                    onPress={() => setIsPublic(false)}
                                >
                                    <Text
                                        style={[
                                            styles.audienceBtnText,
                                            !isPublic && styles.audienceBtnTextActive,
                                        ]}
                                    >
                                        Followers only
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Nút Share nổi */}
                    <View style={[styles.bottomBarContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                        <PrimaryButton
                            title="Share"
                            onPress={handleSharePost}
                        />
                    </View>
                </KeyboardAvoidingView>
            )}

            {/* Camera View */}
            <Modal
                visible={isCameraActive}
                animationType="slide"
                onRequestClose={() => setIsCameraActive(false)}
            >
                <View style={styles.cameraFullscreenContainer}>
                    <CameraView
                        ref={cameraRef}
                        style={StyleSheet.absoluteFill}
                        facing={facing}
                    />

                    <SafeAreaView style={styles.cameraTopControls} edges={['top']}>
                        <TouchableOpacity
                            style={styles.cameraCloseBtn}
                            onPress={() => setIsCameraActive(false)}
                        >
                            <Octicons name="x" size={24} color="#FFFFFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cameraFlipBtn}
                            onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
                        >
                            <Octicons name="sync" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </SafeAreaView>

                    <View style={[styles.cameraBottomControls, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                        <TouchableOpacity
                            style={styles.cameraShutterOuter}
                            activeOpacity={0.8}
                            onPress={handleCapturePhoto}
                        >
                            <View style={styles.cameraShutterInner} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Custom Alert */}
            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                content={alertConfig.content}
                buttonText={alertConfig.buttonText}
                onClose={alertConfig.onClose}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f4f7',
    },
    flex1: {
        flex: 1,
    },
    headerContainer: {
        width: '100%',
        backgroundColor: 'transparent',
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 24,
        marginBottom: 16,
    },
    headerTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 22,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    backBtn: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    placeholderRight: {
        width: 36,
    },
    stepContainer: {
        flex: 1,
        backgroundColor: '#f5f4f7',
    },
    stepScrollContent: {
        paddingBottom: 110,
    },

    // Step 1: Select
    mainPreviewContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainPreviewImage: {
        width: '100%',
        height: '100%',
    },
    emptyPreviewBox: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        gap: 8,
    },
    emptyPromptTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#475569',
        includeFontPadding: false,
    },
    emptyPromptSubtitle: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 13,
        color: '#94A3B8',
        includeFontPadding: false,
    },
    galleryActionBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: 'transparent',
    },
    galleryRecentsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    galleryTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#0F172A',
        includeFontPadding: false,
    },
    selectedCountBadge: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    selectedCountText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 11,
        color: '#FFFFFF',
    },
    openPickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    openPickerText: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 12,
        color: '#0F172A',
        includeFontPadding: false,
    },
    gridContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        gap: THUMB_GAP,
        paddingTop: 8,
    },
    cameraTileBtn: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: 12,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    cameraTileText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 11,
        color: '#475569',
        includeFontPadding: false,
    },
    thumbnailList: {
        gap: THUMB_GAP,
    },
    thumbnailWrapper: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
        position: 'relative',
    },
    thumbnailSelected: {
        borderColor: '#3B82F6',
    },
    thumbnailActivePreview: {
        borderColor: '#0F172A',
        borderWidth: 2.5,
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    selectBadge: {
        position: 'absolute',
        top: 5,
        right: 5,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectBadgeActive: {
        backgroundColor: '#3B82F6',
        borderColor: '#FFFFFF',
    },
    selectBadgeEmpty: {
        width: 0,
        height: 0,
    },
    selectBadgeNum: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 10,
        color: '#FFFFFF',
        includeFontPadding: false,
    },
    thumbLoadingBox: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Step 2: Edit & Filters
    editPreviewWrapper: {
        width: SCREEN_WIDTH * 0.88,
        height: SCREEN_WIDTH * 0.88,
        alignSelf: 'center',
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 20,
        backgroundColor: '#0F172A',
    },
    editPreviewImage: {
        width: '100%',
        height: '100%',
    },
    editControlsContainer: {
        marginTop: 20,
        paddingBottom: 28,
    },
    sectionSmallLabel: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        color: '#64748B',
        marginHorizontal: 20,
        marginBottom: 10,
    },
    filterList: {
        paddingHorizontal: 20,
        gap: 14,
    },
    filterOptionItem: {
        alignItems: 'center',
        gap: 6,
    },
    filterPreviewThumb: {
        width: 64,
        height: 64,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    filterPreviewThumbActive: {
        borderColor: '#3B82F6',
    },
    filterThumbImage: {
        width: '100%',
        height: '100%',
    },
    filterNameText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 11,
        color: '#64748B',
    },
    filterNameTextActive: {
        fontFamily: 'GoogleSans-Bold',
        color: '#0F172A',
    },

    // Step 3: Details
    detailsScrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 110,
        gap: 16,
    },
    captionRowCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    detailsThumbPreview: {
        width: 72,
        height: 72,
        borderRadius: 10,
    },
    captionInput: {
        flex: 1,
        fontFamily: 'GoogleSans-Regular',
        fontSize: 14,
        color: '#0F172A',
        textAlignVertical: 'top',
        includeFontPadding: false,
    },
    sectionGroupCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 12,
    },
    fieldHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    fieldHeaderTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#0F172A',
        includeFontPadding: false,
    },
    locationPillsRow: {
        gap: 8,
        paddingVertical: 2,
    },
    locationPill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#E2E8F0',
    },
    locationPillActive: {
        backgroundColor: '#0284C7',
    },
    locationPillText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 12,
        color: '#334155',
        includeFontPadding: false,
    },
    locationPillTextActive: {
        fontFamily: 'GoogleSans-Bold',
        color: '#FFFFFF',
    },
    audienceOptionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    audienceBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    audienceBtnActive: {
        backgroundColor: '#0F172A',
    },
    audienceBtnText: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 13,
        color: '#64748B',
        includeFontPadding: false,
    },
    audienceBtnTextActive: {
        fontFamily: 'GoogleSans-Bold',
        color: '#FFFFFF',
    },
    bottomBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 12,
        backgroundColor: 'transparent',
    },

    // Camera Fullscreen Modal
    cameraFullscreenContainer: {
        flex: 1,
        backgroundColor: '#000000',
    },
    cameraTopControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 12,
        zIndex: 10,
    },
    cameraCloseBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraFlipBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraBottomControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    cameraShutterOuter: {
        width: 76,
        height: 76,
        borderRadius: 38,
        borderWidth: 4,
        borderColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraShutterInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFFFFF',
    },
});