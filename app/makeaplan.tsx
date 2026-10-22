import React, { useState, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Modal,
    TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import ExpandableCard from '../components/ExpandableCard';
import UserCard, { UserCardData } from '../components/UserCard';
import VerticalConnector from '../components/VerticalConnector';
import InputField from '../components/InputField';
import PillButtonGroup from '../components/PillButtonGroup';
import PrimaryButton from '../components/PrimaryButton';
import StepProgressBar from '../components/StepProgressBar';
import SearchFloat from '../components/SearchFloat';

type WizardStep = 'CHOOSE_ROUTE' | 'INFORMATION' | 'TEAMING' | 'PICK_ITEM' | 'NOTE' | 'FINISH';
type SortOption = 'name' | 'nearest' | 'creation date';

const WIZARD_STEPS: WizardStep[] = [
    'CHOOSE_ROUTE',
    'INFORMATION',
    'TEAMING',
    'PICK_ITEM',
    'NOTE',
    'FINISH',
];

interface RouteItem {
    id: string;
    title: string;
    color: string;
    startDate: string;
    createdAt: string;
}

export interface EquipmentItem {
    id: string;
    name: string;
    category: string;
    code?: string;
}

export interface ItemCategory {
    id: string;
    name: string;
    items: string[];
}

const MOCK_ROUTES: RouteItem[] = [
    { id: 'r1', title: 'route A', color: '#A7F3D0', startDate: '2026-10-22', createdAt: '2026-09-15' },
    { id: 'r2', title: 'route B', color: '#A7F3D0', startDate: '2026-10-20', createdAt: '2026-10-05' },
    { id: 'r3', title: 'route C', color: '#DDD6FE', startDate: '2026-11-20', createdAt: '2026-08-10' },
    { id: 'r4', title: 'route D', color: '#A7F3D0', startDate: '2026-12-05', createdAt: '2026-09-28' },
];

const MOCK_TEAMS = [
    { id: 't1', name: 'Sixseven Team' },
    { id: 't2', name: 'Alpha Team' },
];

const MOCK_FRIENDS: UserCardData[] = [
    { id: 'u1', name: 'Lê Dương', username: 'leduong232' },
    { id: 'u2', name: 'Nguyễn Huy Hoàng', username: 'huyhoangnguyen' },
    { id: 'u3', name: 'Võ Đặng Hồng Uyên', username: 'cuddlebug242404' },
    { id: 'u4', name: 'Trần Văn Nam', username: 'namtv2026' },
];

const INITIAL_ITEM_CATEGORIES: ItemCategory[] = [
    {
        id: 'cat_clothing',
        name: 'CLOTHING',
        items: [
            'FLEECE JACKET',
            'BASE LAYER',
            'HARD SHELL',
            'TREKKING PANTS',
            'HAT',
            'BUFF',
            'LINER GLOVES',
            'WATERPROOF GLOVES',
            'RAIN PONCHO',
            'THERMAL SOCKS',
        ],
    },
    {
        id: 'cat_footwear',
        name: 'FOOTWEAR',
        items: ['TREKKING BOOTS', 'CAMP SHOES', 'GAITERS', 'SANDALS', 'CRAMPONS'],
    },
    {
        id: 'cat_backpacks',
        name: 'BACKPACKS',
        items: ['DRY BAG', 'RAIN COVER', 'TREKKING BACKPACK', 'DAYPACK', 'WAIST PACK'],
    },
    {
        id: 'cat_safety',
        name: 'SAFETY & FIRST AID',
        items: ['FIRST AID KIT', 'EMERGENCY BLANKET', 'WHISTLE', 'MULTI-TOOL', 'SUNSCREEN'],
    },
];

const INITIAL_VISIBLE_ITEM_COUNT = 4;

const formatDate = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

const formatTime = (d: Date) => {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const maskDateInput = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 8);
    if (cleaned.length >= 5) {
        return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
    } else if (cleaned.length >= 3) {
        return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    return cleaned;
};

const maskTimeInput = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 3) {
        return `${cleaned.slice(0, 2)}:${cleaned.slice(2)}`;
    }
    return cleaned;
};

export default function MakeAPlanScreen() {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const step = WIZARD_STEPS[currentStepIndex];

    const [selectedRouteId, setSelectedRouteId] = useState<string>('r1');
    const [isCreatingNewRoute, setIsCreatingNewRoute] = useState(false);
    const [routeSortBy, setRouteSortBy] = useState<SortOption>('name');
    const [isMenuVisible, setIsMenuVisible] = useState<boolean>(false);

    const [planName, setPlanName] = useState('');
    const [dateBegin, setDateBegin] = useState(() => formatDate(new Date()));
    const [timeBegin, setTimeBegin] = useState(() => formatTime(new Date()));

    const [dateEnd, setDateEnd] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return formatDate(tomorrow);
    });
    const [timeEnd, setTimeEnd] = useState(() => formatTime(new Date()));

    const [difficulty, setDifficulty] = useState<string>('MEDIUM');
    const [description, setDescription] = useState('');

    const [hasTeam, setHasTeam] = useState<'YES' | 'NO'>('NO');
    const [isRandomMatchmaking, setIsRandomMatchmaking] = useState<'YES' | 'NO'>('NO');
    const [maxMembers, setMaxMembers] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState<string>('t1');

    const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);
    const [isSearchUserVisible, setIsSearchUserVisible] = useState(false);

    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [noteContent, setNoteContent] = useState('');

    const [itemCategories, setItemCategories] = useState<ItemCategory[]>(INITIAL_ITEM_CATEGORIES);
    const [activeCategoryForSearch, setActiveCategoryForSearch] = useState<ItemCategory | null>(null);

    const flatEquipmentList = useMemo(() => {
        const list: EquipmentItem[] = [];
        itemCategories.forEach((cat) => {
            cat.items.forEach((item, index) => {
                list.push({
                    id: `${cat.id}_${index}`,
                    name: item,
                    category: cat.name,
                });
            });
        });
        return list;
    }, [itemCategories]);

    const sortedRoutes = useMemo(() => {
        const listCopy = [...MOCK_ROUTES];
        switch (routeSortBy) {
            case 'name':
                return listCopy.sort((a, b) => a.title.localeCompare(b.title));
            case 'nearest':
                return listCopy.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
            case 'creation date':
                return listCopy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            default:
                return listCopy;
        }
    }, [routeSortBy]);

    const goNext = () => {
        if (currentStepIndex < WIZARD_STEPS.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            router.back();
        }
    };

    const goBack = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
        } else {
            router.back();
        }
    };

    const toggleItem = (itemName: string) => {
        if (selectedItems.includes(itemName)) {
            setSelectedItems(selectedItems.filter((i) => i !== itemName));
        } else {
            setSelectedItems([...selectedItems, itemName]);
        }
    };

    const toggleInviteUser = (userId: string) => {
        if (invitedUserIds.includes(userId)) {
            setInvitedUserIds(invitedUserIds.filter((id) => id !== userId));
        } else {
            setInvitedUserIds([...invitedUserIds, userId]);
        }
    };

    const handleAddItemToCategory = (categoryName: string, newItemName: string) => {
        setItemCategories((prev) =>
            prev.map((cat) => {
                if (cat.name === categoryName) {
                    return {
                        ...cat,
                        items: cat.items.includes(newItemName) ? cat.items : [...cat.items, newItemName],
                    };
                }
                return cat;
            })
        );
        if (!selectedItems.includes(newItemName)) {
            setSelectedItems((prev) => [...prev, newItemName]);
        }
    };

    const handleSelectSort = (option: SortOption) => {
        setRouteSortBy(option);
        setIsMenuVisible(false);
    };

    const renderStepContent = () => {
        switch (step) {
            case 'CHOOSE_ROUTE':
                return (
                    <View style={styles.stepContent}>
                        <View style={styles.legendWrapper}>
                            <View style={styles.legendLines}>
                                <View style={[styles.legendBox, { backgroundColor: '#3B82F6' }]} />
                                <Text style={styles.legendText}>choosen</Text>
                            </View>
                            <View style={styles.legendLines}>
                                <View style={[styles.legendBox, { backgroundColor: '#A7F3D0' }]} />
                                <Text style={styles.legendText}>owned by you</Text>
                            </View>
                            <View style={styles.legendLines}>
                                <View style={[styles.legendBox, { backgroundColor: '#DDD6FE' }]} />
                                <Text style={styles.legendText}>owned by someone else</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.filterBtnIcon}
                                activeOpacity={0.7}
                                onPress={() => setIsMenuVisible(true)}
                            >
                                <Octicons name="sort-desc" size={20} color="#0F172A" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.newRouteBtn}
                            activeOpacity={0.7}
                            onPress={() => setIsCreatingNewRoute(!isCreatingNewRoute)}
                        >
                            <Octicons name="plus-circle" size={20} color="#94A3B8" />
                            <Text style={styles.newRouteText}>New route ?</Text>
                        </TouchableOpacity>

                        {sortedRoutes.map((route) => {
                            const isSelected = selectedRouteId === route.id;
                            return (
                                <ExpandableCard
                                    key={route.id}
                                    id={route.id}
                                    title={route.title}
                                    iconName="question"
                                    headerColor={isSelected ? '#3B82F6' : route.color}
                                    onHeaderPress={(id) => setSelectedRouteId(id)}
                                    defaultExpanded={false}
                                >
                                    <View style={styles.cardInnerMock}>
                                        <Text style={styles.placeholderText}>📅 {route.startDate}</Text>
                                        <Text style={styles.placeholderText}>🕒 {route.createdAt}</Text>
                                    </View>
                                </ExpandableCard>
                            );
                        })}
                    </View>
                );

            case 'INFORMATION':
                return (
                    <View style={styles.stepContent}>
                        <InputField
                            label="NAME"
                            placeholder="NAME YOUR PLAN HERE"
                            value={planName}
                            onChangeText={setPlanName}
                        />

                        <VerticalConnector height={32} />

                        <View style={styles.rowInputs}>
                            <View style={styles.flex1}>
                                <InputField
                                    label="DATE BEGIN"
                                    placeholder="DD/MM/YYYY"
                                    keyboardType="number-pad"
                                    maxLength={10}
                                    value={dateBegin}
                                    onChangeText={(val) => setDateBegin(maskDateInput(val))}
                                />
                            </View>
                            <View style={styles.flex1}>
                                <InputField
                                    label="TIME"
                                    placeholder="HH:MM"
                                    keyboardType="number-pad"
                                    maxLength={5}
                                    value={timeBegin}
                                    onChangeText={(val) => setTimeBegin(maskTimeInput(val))}
                                />
                            </View>
                        </View>

                        <VerticalConnector height={32} />

                        <View style={styles.rowInputs}>
                            <View style={styles.flex1}>
                                <InputField
                                    label="DATE END"
                                    placeholder="DD/MM/YYYY"
                                    keyboardType="number-pad"
                                    maxLength={10}
                                    value={dateEnd}
                                    onChangeText={(val) => setDateEnd(maskDateInput(val))}
                                />
                            </View>
                            <View style={styles.flex1}>
                                <InputField
                                    label="TIME"
                                    placeholder="HH:MM"
                                    keyboardType="number-pad"
                                    maxLength={5}
                                    value={timeEnd}
                                    onChangeText={(val) => setTimeEnd(maskTimeInput(val))}
                                />
                            </View>
                        </View>

                        <VerticalConnector height={32} />

                        <View style={styles.inputGroupContainer}>
                            <Text style={styles.inputLabel}>DIFFICULTY LEVEL</Text>
                            <PillButtonGroup
                                options={['CHILL', 'EASY', 'MEDIUM', 'HARD', 'CHALLENGE']}
                                selectedValue={difficulty}
                                onSelect={(lvl) => setDifficulty(lvl)}
                            />
                        </View>

                        <VerticalConnector height={32} />

                        <InputField
                            label="DESCRIBE"
                            placeholder="ENTER PLAN DESCRIPTION"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                        />
                    </View>
                );

            case 'TEAMING':
                return (
                    <View style={styles.stepContent}>
                        <View style={styles.inputGroupContainer}>
                            <Text style={styles.inputLabel}>HAS A TEAM ?</Text>
                            <PillButtonGroup
                                options={['YES', 'NO']}
                                selectedValue={hasTeam}
                                onSelect={(val) => setHasTeam(val as 'YES' | 'NO')}
                                size="large"
                                direction="row"
                            />
                        </View>

                        <VerticalConnector height={32} />

                        {hasTeam === 'NO' ? (
                            <>
                                <View style={styles.inputGroupContainer}>
                                    <Text style={styles.inputLabel}>RANDOM MATCHMAKING</Text>
                                    <PillButtonGroup
                                        options={['YES', 'NO']}
                                        selectedValue={isRandomMatchmaking}
                                        onSelect={(val) => setIsRandomMatchmaking(val as 'YES' | 'NO')}
                                        size="large"
                                        direction="row"
                                    />
                                    <Text style={styles.helpText}>
                                        {isRandomMatchmaking === 'YES'
                                            ? 'Everyone can search and join your team automatically.'
                                            : 'Others cannot find your team unless you invite them.'}
                                    </Text>
                                </View>

                                <VerticalConnector height={32} />

                                <InputField
                                    label="MAXIMUM MEMBER"
                                    placeholder="ENTER YOUR TEAM MAX MEMBER"
                                    keyboardType="numeric"
                                    value={maxMembers}
                                    onChangeText={setMaxMembers}
                                />

                                <VerticalConnector height={32} />

                                <View style={styles.inputGroupContainer}>
                                    <Text style={styles.inputLabel}>INVITE</Text>

                                    <TouchableOpacity
                                        style={styles.searchUserTrigger}
                                        activeOpacity={0.7}
                                        onPress={() => setIsSearchUserVisible(true)}
                                    >
                                        <Text style={styles.searchUserTriggerText}>Search someone</Text>
                                    </TouchableOpacity>

                                    <View style={styles.userListContainer}>
                                        {MOCK_FRIENDS.map((user) => {
                                            const isInvited = invitedUserIds.includes(user.id);
                                            return (
                                                <UserCard
                                                    key={user.id}
                                                    user={user}
                                                    isInvited={isInvited}
                                                    onInvitePress={(u) => toggleInviteUser(u.id)}
                                                />
                                            );
                                        })}
                                    </View>
                                </View>
                            </>
                        ) : (
                            <View style={styles.inputGroupContainer}>
                                <Text style={styles.inputLabel}>CHOOSE A TEAM</Text>
                                {MOCK_TEAMS.map((team) => (
                                    <TouchableOpacity
                                        key={team.id}
                                        style={[styles.teamSelectCard, selectedTeamId === team.id && styles.teamSelectCardActive]}
                                        onPress={() => setSelectedTeamId(team.id)}
                                    >
                                        <View style={styles.teamAvatars}>
                                            <View style={styles.avatarCircleBlack} />
                                            <View style={styles.avatarCircleWhite} />
                                        </View>
                                        <Text style={[styles.teamSelectText, selectedTeamId === team.id && styles.teamSelectTextActive]}>
                                            {team.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                );

            case 'PICK_ITEM':
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.blueTitleLarge}>CHOOSE THE ITEMS YOU THINK ARE NECESSARY</Text>

                        {itemCategories.map((category) => {
                            const visibleItems = category.items.slice(0, INITIAL_VISIBLE_ITEM_COUNT);

                            return (
                                <React.Fragment key={category.id}>
                                    <VerticalConnector height={32} />

                                    <View style={styles.categorySection}>
                                        <Text style={styles.inputLabel}>{category.name}</Text>
                                        <View style={styles.pillGroupWrapper}>
                                            <PillButtonGroup
                                                options={visibleItems}
                                                selectedValue={selectedItems}
                                                onSelect={(item) => toggleItem(item)}
                                            />

                                            <TouchableOpacity
                                                style={styles.moreBtnPill}
                                                activeOpacity={0.7}
                                                onPress={() => setActiveCategoryForSearch(category)}
                                            >
                                                <Text style={styles.moreBtnText}>MORE ...</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </React.Fragment>
                            );
                        })}
                    </View>
                );

            case 'NOTE':
                return (
                    <View style={styles.stepContent}>
                        <InputField
                            label="TAKE A NOTE"
                            placeholder="NOTE ..."
                            value={noteContent}
                            onChangeText={setNoteContent}
                            multiline
                        />
                    </View>
                );

            case 'FINISH':
                return (
                    <View style={styles.finishContainer}>
                        <View style={styles.smileyIconWrapper}>
                            <Octicons name="smiley" size={60} color="#000000" />
                        </View>
                        <Text style={styles.finishTitle}>You have finished creating the plan</Text>
                        <Text style={styles.finishSubtitle}>Click finish to return to your plan management page</Text>
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                {/* Header Bar đồng bộ với PostScreen */}
                <View style={styles.headerBar}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={goBack}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Octicons name="chevron-left" size={24} color="#0F172A" />
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>MAKE A PLAN</Text>

                    <View style={styles.placeholderRight} />
                </View>

                {step !== 'FINISH' && (
                    <StepProgressBar
                        currentStepIndex={currentStepIndex}
                        totalSteps={WIZARD_STEPS.length - 1}
                        stepName={step}
                    />
                )}

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {renderStepContent()}
                </ScrollView>

                <View style={styles.bottomBar}>
                    <PrimaryButton title={step === 'FINISH' ? 'Finish' : 'Continue'} onPress={goNext} />
                </View>
            </KeyboardAvoidingView>

            {/* SearchFloat cho Mời Thành Viên */}
            <SearchFloat<UserCardData>
                visible={isSearchUserVisible}
                data={MOCK_FRIENDS}
                searchFields={['name', 'username']}
                placeholder="Search someone"
                contentLayout="list"
                onClose={() => setIsSearchUserVisible(false)}
                renderItem={(user) => {
                    const isInvited = invitedUserIds.includes(user.id);
                    return (
                        <UserCard
                            key={user.id}
                            user={user}
                            isInvited={isInvited}
                            onInvitePress={(u) => toggleInviteUser(u.id)}
                        />
                    );
                }}
            />

            {/* SearchFloat cho Đồ Đạc/Trang Thiết Bị */}
            <SearchFloat<EquipmentItem>
                visible={Boolean(activeCategoryForSearch)}
                data={flatEquipmentList}
                searchFields={['name', 'code', 'category']}
                categoryKey="category"
                selectedCategory={activeCategoryForSearch?.name}
                placeholder="Search for item"
                contentLayout="wrap"
                onClose={() => setActiveCategoryForSearch(null)}
                renderItem={(item, index) => {
                    const isSelected = selectedItems.includes(item.name);
                    return (
                        <TouchableOpacity
                            key={item.id ?? index}
                            style={[styles.modalPill, isSelected && styles.modalPillSelected]}
                            activeOpacity={0.8}
                            onPress={() => toggleItem(item.name)}
                        >
                            <Text style={[styles.modalPillText, isSelected && styles.modalPillTextSelected]}>
                                {item.name}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
                renderFooterAction={(query) => {
                    const cleanQuery = query.trim().toUpperCase();
                    if (!cleanQuery || !activeCategoryForSearch) return null;

                    const exists = activeCategoryForSearch.items.includes(cleanQuery);
                    if (exists) return null;

                    return (
                        <TouchableOpacity
                            style={styles.addNewItemBtn}
                            activeOpacity={0.8}
                            onPress={() => {
                                handleAddItemToCategory(activeCategoryForSearch.name, cleanQuery);
                            }}
                        >
                            <Octicons name="plus" size={16} color="#3B82F6" />
                            <Text style={styles.addNewItemText}>ADD "{cleanQuery}"</Text>
                        </TouchableOpacity>
                    );
                }}
            />

            {/* Modal Sắp Xếp Tuyến Đường */}
            <Modal visible={isMenuVisible} transparent animationType="fade" onRequestClose={() => setIsMenuVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setIsMenuVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.dropdownMenuContainer}>
                            <TouchableOpacity
                                style={[styles.menuOptionBtn, styles.menuOptionTop, routeSortBy === 'name' && styles.menuOptionSelected]}
                                activeOpacity={0.8}
                                onPress={() => handleSelectSort('name')}
                            >
                                <Text style={[styles.menuOptionText, routeSortBy === 'name' && styles.menuOptionTextSelected]}>name</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.menuOptionBtn, styles.menuOptionMiddle, routeSortBy === 'nearest' && styles.menuOptionSelected]}
                                activeOpacity={0.8}
                                onPress={() => handleSelectSort('nearest')}
                            >
                                <Text style={[styles.menuOptionText, routeSortBy === 'nearest' && styles.menuOptionTextSelected]}>nearest</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.menuOptionBtn, styles.menuOptionBottom, routeSortBy === 'creation date' && styles.menuOptionSelected]}
                                activeOpacity={0.8}
                                onPress={() => handleSelectSort('creation date')}
                            >
                                <Text style={[styles.menuOptionText, routeSortBy === 'creation date' && styles.menuOptionTextSelected]}>creation date</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    container: { flex: 1, backgroundColor: '#F8FAFC' },

    /* Header Bar đồng bộ với PostScreen */
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 12,
        marginBottom: 24,
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

    scrollContent: { paddingHorizontal: 24, paddingBottom: 120 },
    stepContent: { flex: 1 },

    legendWrapper: { position: 'relative', marginBottom: 16, gap: 8 },
    legendLines: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendBox: {
        width: 32,
        height: 10,
        borderRadius: 4,
    },
    legendText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 12,
        color: '#94A3B8',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },

    filterBtnIcon: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    newRouteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 12, marginBottom: 16 },
    newRouteText: { fontFamily: 'GoogleSans-Medium', fontSize: 14, color: '#64748B' },
    cardInnerMock: { gap: 6 },
    placeholderText: { fontFamily: 'GoogleSans-Regular', fontSize: 13, color: '#94A3B8' },

    inputGroupContainer: { marginVertical: 0 },
    rowInputs: { flexDirection: 'row', gap: 24, marginVertical: 0 },
    inputLabel: { fontFamily: 'GoogleSans-Bold', fontSize: 16, color: '#0F172A', marginBottom: 8, textTransform: 'uppercase' },

    helpText: { fontFamily: 'GoogleSans-Medium', fontSize: 12, color: '#94A3B8', marginTop: 6 },
    teamSelectCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginBottom: 12, gap: 12 },
    teamSelectCardActive: { backgroundColor: '#3B82F6' },
    teamAvatars: { flexDirection: 'row' },
    avatarCircleBlack: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1E293B', zIndex: 3 },
    avatarCircleWhite: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', marginLeft: -12, zIndex: 2 },
    teamSelectText: { fontFamily: 'GoogleSans-Medium', fontSize: 15, color: '#0F172A' },
    teamSelectTextActive: { color: '#FFFFFF' },
    blueTitleLarge: { fontFamily: 'GoogleSans-Bold', fontSize: 18, color: '#3B82F6', textTransform: 'uppercase' },
    categorySection: { marginVertical: 0 },

    searchUserTrigger: {
        backgroundColor: '#dddee2',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 12,
        justifyContent: 'center',
        height: 60,
    },
    searchUserTriggerText: {
        fontFamily: 'GoogleSans',
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    userListContainer: {
        gap: 12,
    },

    pillGroupWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
    },
    moreBtnPill: {
        backgroundColor: '#f5f4f7',
        borderWidth: 1,
        borderColor: '#94A3B8',
        borderStyle: 'dashed',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    moreBtnText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        color: '#475569',
    },
    modalPill: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    modalPillSelected: {
        backgroundColor: '#3B82F6',
    },
    modalPillText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        color: '#64748B',
    },
    modalPillTextSelected: {
        color: '#FFFFFF',
    },
    addNewItemBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#3B82F6',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginTop: 8,
        width: '100%',
    },
    addNewItemText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        color: '#3B82F6',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },

    finishContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    smileyIconWrapper: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#BAE6FD', justifyContent: 'center', alignItems: 'center', marginBottom: 32, borderWidth: 20, borderColor: '#E0F2FE' },
    finishTitle: { fontFamily: 'GoogleSans-Bold', fontSize: 18, color: '#334155', textAlign: 'center', marginBottom: 12 },
    finishSubtitle: { fontFamily: 'GoogleSans-Medium', fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },

    bottomBar: {
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
        backgroundColor: 'transparent',
    },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 180, paddingRight: 24 },
    dropdownMenuContainer: { width: 170, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
    menuOptionBtn: { paddingHorizontal: 20, paddingVertical: 12 },
    menuOptionTop: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    menuOptionMiddle: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F1F5F9' },
    menuOptionBottom: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
    menuOptionSelected: { backgroundColor: '#F8FAFC' },
    menuOptionText: { fontFamily: 'GoogleSans-Medium', fontSize: 14, color: '#0F172A' },
    menuOptionTextSelected: { fontFamily: 'GoogleSans-Bold', color: '#0284C7' },
});