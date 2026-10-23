import React, { useState, useRef, useEffect, useCallback } from "react";
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
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Octicons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library/legacy";
import * as Location from "expo-location";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";

import PrimaryButton from "../components/PrimaryButton";
import CustomAlert from "../components/CustomAlert";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const THUMB_SIZE = 76;
const THUMB_GAP = 12;

type Step = "SELECT" | "EDIT" | "DETAILS";

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
  { id: "normal", name: "Normal", overlayColor: "transparent", opacity: 0 },
  { id: "warm", name: "Warm", overlayColor: "#F59E0B", opacity: 0.15 },
  { id: "cool", name: "Cool", overlayColor: "#0284C7", opacity: 0.15 },
  { id: "vivid", name: "Vivid", overlayColor: "#EC4899", opacity: 0.12 },
  { id: "bw", name: "B&W", overlayColor: "#000000", opacity: 0.35 },
];

const SUGGESTED_LOCATIONS = [
  "Ta Nang - Phan Dung",
  "Fansipan Summit",
  "Langbiang Peak, Da Lat",
  "Bidoup Nui Ba National Park",
  "Ba Den Mountain, Tay Ninh",
  "Ho Chi Minh City, Vietnam",
];

export default function CreatePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState<Step>("SELECT");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [activeImageUri, setActiveImageUri] = useState<string | null>(null);

  // Media Library States
  const [libraryPhotos, setLibraryPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);
  const [afterCursor, setAfterCursor] = useState<string | undefined>(undefined);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState<boolean>(false);
  const [isLimitedAccess, setIsLimitedAccess] = useState<boolean>(false);
  const loadingRef = useRef<boolean>(false);

  // Location States
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<AlertState>({
    visible: false,
    title: "",
    content: "",
    buttonText: "OK",
    onClose: () => {},
  });

  const showAlert = (
    title: string,
    content: string,
    buttonText = "OK",
    onClose?: () => void,
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
  const [facing, setFacing] = useState<CameraType>("back");
  const cameraRef = useRef<CameraView>(null);

  // Edit State
  const [selectedFilter, setSelectedFilter] = useState<string>("normal");

  // Details State
  const [caption, setCaption] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(true);

  // Load ảnh từ thiết bị
  const loadDevicePhotos = useCallback(
    async (reset = false) => {
      if (loadingRef.current) return;
      if (!reset && !hasNextPage) return;

      try {
        loadingRef.current = true;
        setIsLoadingPhotos(true);

        const permission = await MediaLibrary.getPermissionsAsync(false);
        let finalStatus = permission.status;
        let accessPrivileges = permission.accessPrivileges;

        if (finalStatus !== "granted") {
          const req = await MediaLibrary.requestPermissionsAsync(false);
          finalStatus = req.status;
          accessPrivileges = req.accessPrivileges;
        }

        const isLimited = accessPrivileges === "limited";
        setIsLimitedAccess(isLimited);

        if (finalStatus !== "granted" && !isLimited) {
          if (!permission.canAskAgain) {
            showAlert(
              "Permission Required",
              "Please enable photo permissions in settings to view device photos.",
            );
          }
          return;
        }

        const assets = await MediaLibrary.getAssetsAsync({
          first: 50,
          after: reset ? undefined : afterCursor,
          mediaType: [MediaLibrary.MediaType.photo],
        });

        if (reset) {
          setLibraryPhotos(assets.assets);
          if (assets.assets.length > 0 && selectedImages.length === 0) {
            setActiveImageUri(assets.assets[0].uri);
          }
        } else {
          setLibraryPhotos((prev) => [...prev, ...assets.assets]);
        }

        setHasNextPage(assets.hasNextPage);
        setAfterCursor(assets.endCursor);
      } catch (error) {
        console.error("Error loading media assets:", error);
        showAlert(
          "Notice",
          "Cannot load device photos directly. You can use Open Gallery.",
        );
      } finally {
        loadingRef.current = false;
        setIsLoadingPhotos(false);
      }
    },
    [hasNextPage, afterCursor, selectedImages.length],
  );

  useEffect(() => {
    loadDevicePhotos(true);
  }, []);

  const handleGetCurrentLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showAlert(
          "Permission Denied",
          "Location permission is required to detect your current position.",
        );
        setIsLocating(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [geocode] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      if (geocode) {
        const parts = [
          geocode.name,
          geocode.district || geocode.subregion,
          geocode.city || geocode.region,
        ].filter(Boolean);

        const locationStr =
          parts.length > 0
            ? parts.join(", ")
            : `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
        setSelectedLocation(locationStr);
      } else {
        setSelectedLocation(
          `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
        );
      }
    } catch {
      showAlert(
        "GPS Error",
        "Unable to detect location. Please check your GPS settings.",
      );
    } finally {
      setIsLocating(false);
    }
  };

  const handleManageLimitedPhotos = async () => {
    try {
      if (MediaLibrary.presentPermissionsPickerAsync) {
        await MediaLibrary.presentPermissionsPickerAsync();
        loadDevicePhotos(true);
      } else {
        handlePickFromLibrary();
      }
    } catch {
      handlePickFromLibrary();
    }
  };

  const handlePickFromLibrary = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showAlert(
          "Permission Denied",
          "Media library access is needed to select photos.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uris = result.assets.map((asset) => asset.uri);
        setSelectedImages((prev) => {
          const combined = Array.from(new Set([...uris, ...prev]));
          return combined.slice(0, 10);
        });
        setActiveImageUri(uris[0]);
      }
    } catch {
      showAlert(
        "Error",
        "Image picker native module is not linked. Please rebuild your app.",
      );
    }
  };

  const handleToggleSelectPhoto = (uri: string) => {
    if (selectedImages.includes(uri)) {
      const updated = selectedImages.filter((u) => u !== uri);
      setSelectedImages(updated);
      if (activeImageUri === uri) {
        setActiveImageUri(updated.length > 0 ? updated[0] : null);
      }
    } else {
      if (selectedImages.length >= 10) {
        showAlert("Limit Reached", "You can select up to 10 photos per post.");
        return;
      }
      setSelectedImages((prev) => [...prev, uri]);
      setActiveImageUri(uri);
    }
  };

  const handleRemoveSelectedImage = (uri: string) => {
    const updated = selectedImages.filter((u) => u !== uri);
    setSelectedImages(updated);
    if (activeImageUri === uri) {
      setActiveImageUri(updated.length > 0 ? updated[0] : null);
    }
  };

  const handleOpenCamera = async () => {
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) {
        showAlert(
          "Permission Denied",
          "Camera permission is required to capture photos.",
        );
        return;
      }
    }
    setIsCameraActive(true);
  };

  const handleCapturePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
        });
        if (photo?.uri) {
          setSelectedImages((prev) => [...prev, photo.uri]);
          setActiveImageUri(photo.uri);
          setIsCameraActive(false);
        }
      } catch {
        showAlert("Error", "Failed to take photo. Please try again.");
      }
    }
  };

  const handleNext = () => {
    if (selectedImages.length === 0) {
      showAlert("Notice", "Please select or capture at least one photo first.");
      return;
    }

    if (currentStep === "SELECT") {
      if (!activeImageUri || !selectedImages.includes(activeImageUri)) {
        setActiveImageUri(selectedImages[0]);
      }
      setCurrentStep("EDIT");
    } else if (currentStep === "EDIT") {
      setCurrentStep("DETAILS");
    }
  };

  const handleBack = () => {
    if (currentStep === "DETAILS") {
      setCurrentStep("EDIT");
    } else if (currentStep === "EDIT") {
      setCurrentStep("SELECT");
    } else {
      router.back();
    }
  };

  const handleSharePost = () => {
    if (selectedImages.length === 0) {
      showAlert("Notice", "Please select at least one photo before sharing.");
      return;
    }
    showAlert(
      "Published",
      "Your post has been successfully shared!",
      "OK",
      () => {
        router.back();
      },
    );
  };

  const getHeaderTitle = () => {
    switch (currentStep) {
      case "SELECT":
        return "NEW POST";
      case "EDIT":
        return "EDIT PHOTO";
      case "DETAILS":
        return "POST DETAILS";
      default:
        return "NEW POST";
    }
  };

  const currentFilterObj =
    FILTER_PRESETS.find((f) => f.id === selectedFilter) || FILTER_PRESETS[0];
  const currentPreviewUri =
    activeImageUri || (selectedImages.length > 0 ? selectedImages[0] : null);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
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
      {currentStep === "SELECT" && (
        <View style={styles.stepContainer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.stepScrollContent}
          >
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
                  <Text style={styles.emptyPromptSubtitle}>
                    Tap to choose photos from device
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Bar thông tin & nút mở Thư viện */}
            <View style={styles.galleryActionBar}>
              <View style={styles.galleryRecentsHeader}>
                <Text style={styles.galleryTitle}>Recents</Text>
                {selectedImages.length > 0 && (
                  <View style={styles.selectedCountBadge}>
                    <Text style={styles.selectedCountText}>
                      {selectedImages.length}/10
                    </Text>
                  </View>
                )}
                {isLimitedAccess && (
                  <TouchableOpacity
                    style={styles.manageAccessBtn}
                    activeOpacity={0.7}
                    onPress={handleManageLimitedPhotos}
                  >
                    <Text style={styles.manageAccessText}>Manage</Text>
                  </TouchableOpacity>
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
                removeClippedSubviews={Platform.OS === "android"}
                getItemLayout={(_, index) => ({
                  length: THUMB_SIZE + THUMB_GAP,
                  offset: (THUMB_SIZE + THUMB_GAP) * index,
                  index,
                })}
                onEndReached={() => {
                  if (
                    libraryPhotos.length > 0 &&
                    !loadingRef.current &&
                    hasNextPage
                  ) {
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
                  const isCurrentActive = activeImageUri === item.uri;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.thumbnailWrapper,
                        isSelected && styles.thumbnailSelected,
                        isCurrentActive && styles.thumbnailActivePreview,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => setActiveImageUri(item.uri)}
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
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        {isSelected ? (
                          <Text style={styles.selectBadgeNum}>
                            {selectOrder}
                          </Text>
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

          <View
            style={[
              styles.bottomBarContainer,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <PrimaryButton title="Next" onPress={handleNext} />
          </View>
        </View>
      )}

      {/* Step 2: Edit & Filters */}
      {currentStep === "EDIT" && (
        <View style={styles.stepContainer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.stepScrollContent}
          >
            <View style={styles.editPreviewWrapper}>
              {currentPreviewUri && (
                <Image
                  source={{ uri: currentPreviewUri }}
                  style={styles.editPreviewImage}
                  resizeMode="cover"
                />
              )}
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

            {selectedImages.length > 1 && (
              <View style={styles.selectedImagesSelector}>
                <Text style={styles.sectionSmallLabel}>
                  Selected Photos (
                  {selectedImages.indexOf(currentPreviewUri || "") + 1}/
                  {selectedImages.length})
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.selectedEditThumbList}
                >
                  {selectedImages.map((uri, idx) => {
                    const isSelectedForEdit = currentPreviewUri === uri;
                    return (
                      <TouchableOpacity
                        key={`${uri}_${idx}`}
                        style={[
                          styles.editThumbnailItem,
                          isSelectedForEdit && styles.editThumbnailItemActive,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => setActiveImageUri(uri)}
                      >
                        <Image
                          source={{ uri }}
                          style={styles.editThumbnailImg}
                          resizeMode="cover"
                        />
                        <View style={styles.thumbIndexBadge}>
                          <Text style={styles.thumbIndexText}>{idx + 1}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

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
                        {currentPreviewUri && (
                          <Image
                            source={{ uri: currentPreviewUri }}
                            style={styles.filterThumbImage}
                            resizeMode="cover"
                          />
                        )}
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

          <View
            style={[
              styles.bottomBarContainer,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <PrimaryButton title="Next" onPress={handleNext} />
          </View>
        </View>
      )}

      {/* Step 3: Details */}
      {currentStep === "DETAILS" && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex1}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.detailsScrollContent}
          >
            <View style={styles.detailsPhotosContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.detailsPhotosList}
              >
                {selectedImages.map((uri, index) => {
                  const isActivePreview = currentPreviewUri === uri;
                  return (
                    <View
                      key={`${uri}_${index}`}
                      style={styles.detailsPhotoWrapper}
                    >
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => setActiveImageUri(uri)}
                        style={[
                          styles.detailsPhotoBox,
                          isActivePreview && styles.detailsPhotoBoxActive,
                        ]}
                      >
                        <Image
                          source={{ uri }}
                          style={styles.detailsThumbPreview}
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
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.removePhotoBtn}
                        activeOpacity={0.8}
                        onPress={() => handleRemoveSelectedImage(uri)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Octicons name="x" size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.captionCard}>
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
                <Text style={styles.fieldHeaderTitle}>Location</Text>
              </View>

              <View style={styles.locationInputRow}>
                <Octicons
                  name="search"
                  size={14}
                  color="#94A3B8"
                  style={styles.locationSearchIcon}
                />
                <TextInput
                  style={styles.locationTextInput}
                  placeholder="Search or enter location..."
                  placeholderTextColor="#94A3B8"
                  value={selectedLocation}
                  onChangeText={setSelectedLocation}
                  returnKeyType="done"
                />

                {selectedLocation.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearLocationBtn}
                    onPress={() => setSelectedLocation("")}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Octicons name="x" size={14} color="#64748B" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.gpsActionBtn}
                  activeOpacity={0.8}
                  onPress={handleGetCurrentLocation}
                  disabled={isLocating}
                >
                  {isLocating ? (
                    <ActivityIndicator size="small" color="#0284C7" />
                  ) : (
                    <Ionicons
                      name="navigate-circle-outline"
                      size={22}
                      color="#0284C7"
                    />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionHeaderLabel}>
                  Suggested spots
                </Text>
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
                          setSelectedLocation(isLocSelected ? "" : loc)
                        }
                      >
                        <Octicons
                          name="location"
                          size={11}
                          color={isLocSelected ? "#FFFFFF" : "#64748B"}
                          style={{ marginRight: 6 }}
                        />
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

          <View
            style={[
              styles.bottomBarContainer,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <PrimaryButton title="Share" onPress={handleSharePost} />
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

          <SafeAreaView style={styles.cameraTopControls} edges={["top"]}>
            <TouchableOpacity
              style={styles.cameraCloseBtn}
              onPress={() => setIsCameraActive(false)}
            >
              <Octicons name="x" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cameraFlipBtn}
              onPress={() =>
                setFacing((prev) => (prev === "back" ? "front" : "back"))
              }
            >
              <Octicons name="sync" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>

          <View
            style={[
              styles.cameraBottomControls,
              { paddingBottom: Math.max(insets.bottom, 24) },
            ]}
          >
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
    backgroundColor: "#f5f4f7",
  },
  flex1: {
    flex: 1,
  },
  headerContainer: {
    width: "100%",
    backgroundColor: "transparent",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 24,
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: "GoogleSans-Bold",
    fontSize: 22,
    color: "#0F172A",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  placeholderRight: {
    width: 36,
  },
  stepContainer: {
    flex: 1,
    backgroundColor: "#f5f4f7",
  },
  stepScrollContent: {
    paddingBottom: 110,
  },

  // Step 1: Select
  mainPreviewContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  mainPreviewImage: {
    width: "100%",
    height: "100%",
  },
  emptyPreviewBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 8,
  },
  emptyPromptTitle: {
    fontFamily: "GoogleSans-Bold",
    fontSize: 15,
    color: "#475569",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  emptyPromptSubtitle: {
    fontFamily: "GoogleSans-Regular",
    fontSize: 13,
    color: "#94A3B8",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  galleryActionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "transparent",
  },
  galleryRecentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  galleryTitle: {
    fontFamily: "GoogleSans-Bold",
    fontSize: 16,
    color: "#0F172A",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  selectedCountBadge: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  selectedCountText: {
    fontFamily: "GoogleSans-Bold",
    fontSize: 11,
    color: "#FFFFFF",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  manageAccessBtn: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  manageAccessText: {
    fontFamily: "GoogleSans-Medium",
    fontSize: 11,
    color: "#0F172A",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  openPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  openPickerText: {
    fontFamily: "GoogleSans-Medium",
    fontSize: 12,
    color: "#0F172A",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  gridContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: THUMB_GAP,
    paddingTop: 8,
  },
  cameraTileBtn: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  cameraTileText: {
    fontFamily: "GoogleSans-Bold",
    fontSize: 11,
    color: "#475569",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  thumbnailList: {
    gap: THUMB_GAP,
  },
  thumbnailWrapper: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  thumbnailSelected: {
    borderColor: "#3B82F6",
  },
  thumbnailActivePreview: {
    borderColor: "#0F172A",
    borderWidth: 2.5,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  selectBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  selectBadgeActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#FFFFFF",
  },
  selectBadgeEmpty: {
    width: 0,
    height: 0,
  },
  selectBadgeNum: {
    fontFamily: "GoogleSans-Bold",
    fontSize: 11,
    color: "#FFFFFF",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  thumbLoadingBox: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },

  // Step 2: Edit & Filters
  editPreviewWrapper: {
    width: SCREEN_WIDTH * 0.88,
    height: SCREEN_WIDTH * 0.88,
    alignSelf: "center",
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 20,
    backgroundColor: "#0F172A",
  },
  editPreviewImage: {
    width: "100%",
    height: "100%",
  },
  selectedImagesSelector: {
    marginTop: 16,
  },
  selectedEditThumbList: {
    paddingHorizontal: 20,
    gap: 10,
    paddingTop: 8,
  },
  editThumbnailItem: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  editThumbnailItemActive: {
    borderColor: "#3B82F6",
  },
  editThumbnailImg: {
    width: "100%",
    height: "100%",
  },
  thumbIndexBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  thumbIndexText: {
    fontFamily: "GoogleSans-Bold",
    fontSize: 9,
    color: "#FFFFFF",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  editControlsContainer: {
    marginTop: 20,
    paddingBottom: 28,
  },
  sectionSmallLabel: {
    fontFamily: "GoogleSans-Bold",
    fontSize: 13,
    color: "#64748B",
    marginHorizontal: 20,
    marginBottom: 8,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  filterList: {
    paddingHorizontal: 20,
    gap: 14,
  },
  filterOptionItem: {
    alignItems: "center",
    gap: 6,
  },
  filterPreviewThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  filterPreviewThumbActive: {
    borderColor: "#3B82F6",
  },
  filterThumbImage: {
    width: "100%",
    height: "100%",
  },
  filterNameText: {
    fontFamily: "GoogleSans-Regular",
    fontSize: 11,
    color: "#64748B",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  filterNameTextActive: {
    fontFamily: "GoogleSans-Bold",
    color: "#0F172A",
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  // Step 3: Details
  detailsScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
    gap: 16,
  },
  detailsPhotosContainer: {
    marginBottom: 4,
  },
  detailsPhotosList: {
    gap: 12,
    paddingVertical: 4,
  },
  detailsPhotoWrapper: {
    position: "relative",
  },
  detailsPhotoBox: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  detailsPhotoBoxActive: {
    borderColor: "#3B82F6",
  },
  detailsThumbPreview: {
    width: "100%",
    height: "100%",
  },
  removePhotoBtn: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#0F172A",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    zIndex: 5,
  },
  captionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  captionInput: {
    fontFamily: "GoogleSans-Regular",
    fontSize: 14,
    color: "#0F172A",
    textAlignVertical: "top",
    includeFontPadding: false,
    minHeight: 80,
  },
  sectionGroupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  fieldHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fieldHeaderTitle: {
    fontFamily: "GoogleSans-Bold",
    fontSize: 14,
    color: "#0F172A",
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  locationInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  locationSearchIcon: {
    marginRight: 2,
  },
  locationTextInput: {
    flex: 1,
    fontFamily: "GoogleSans-Regular",
    fontSize: 13,
    color: "#0F172A",
    includeFontPadding: false,
    textAlignVertical: "center",
    height: "100%",
  },
  clearLocationBtn: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  gpsActionBtn: {
    paddingLeft: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionsContainer: {
    gap: 8,
  },
  suggestionHeaderLabel: {
    fontFamily: "GoogleSans-Medium",
    fontSize: 12,
    color: "#94A3B8",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  locationPillsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  locationPillActive: {
    backgroundColor: "#0284C7",
  },
  locationPillText: {
    fontFamily: "GoogleSans-Regular",
    fontSize: 12,
    color: "#334155",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  locationPillTextActive: {
    fontFamily: "GoogleSans-Bold",
    color: "#FFFFFF",
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  audienceOptionRow: {
    flexDirection: "row",
    gap: 10,
  },
  audienceBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  audienceBtnActive: {
    backgroundColor: "#0F172A",
  },
  audienceBtnText: {
    fontFamily: "GoogleSans-Medium",
    fontSize: 13,
    color: "#64748B",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  audienceBtnTextActive: {
    fontFamily: "GoogleSans-Bold",
    color: "#FFFFFF",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  bottomBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "transparent",
  },

  // Camera Fullscreen Modal
  cameraFullscreenContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  cameraTopControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    zIndex: 10,
  },
  cameraCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraFlipBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraBottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  cameraShutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraShutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
  },
});
