import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, View, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';

import PeopleFill from '../../assets/icons/PeopleFill';

export default function TabLayout() {
    const insets = useSafeAreaInsets();
    const bottomMargin = Math.max(insets.bottom + 20, 16);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: true,
                tabBarActiveTintColor: '#1E293B',
                tabBarInactiveTintColor: '#64748B',
                tabBarButton: (props) => (
                    <PlatformPressable
                        {...props}
                        android_ripple={{ color: 'transparent' }}
                        style={props.style}
                    />
                ),
                tabBarLabelStyle: {
                    fontFamily: 'GoogleSans-Medium',
                    fontSize: 10.5,
                    marginTop: -2,
                    marginBottom: 0,
                },
                tabBarStyle: [
                    styles.tabBar,
                    {
                        bottom: bottomMargin,
                    },
                ],
                tabBarItemStyle: styles.tabBarItem,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconContainer, focused && styles.activeTabBg]}>
                            <Octicons
                                name={focused ? 'home-fill' : 'home'}
                                size={19}
                                color={focused ? '#1E293B' : color}
                            />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="plan"
                options={{
                    title: 'Plan',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconContainer, focused && styles.activeTabBg]}>
                            <Octicons
                                name={focused ? 'bookmark-filled' : 'bookmark'}
                                size={19}
                                color={focused ? '#1E293B' : color}
                            />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="team"
                options={{
                    title: 'Team',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconContainer, focused && styles.activeTabBg]}>
                            {focused ? (
                                <PeopleFill size={19} color="#1E293B" />
                            ) : (
                                <Octicons
                                    name="people"
                                    size={19}
                                    color={color}
                                />
                            )}
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconContainer, focused && styles.activeTabBg]}>
                            <Octicons
                                name={focused ? 'person-fill' : 'person'}
                                size={19}
                                color={focused ? '#1E293B' : color}
                            />
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}

function PlatformPressable(props: any) {
    return (
        <Pressable
            {...props}
            android_ripple={{ color: 'transparent' }}
            style={({ pressed }) => [
                props.style,
                { opacity: 1 }
            ]}
        />
    );
}

export const tabBarStyleObject = {
    position: 'absolute' as const,
    marginHorizontal: '8%' as const,
    height: 58,
    backgroundColor: '#FFFFFF',
    borderRadius: 29,
    borderTopWidth: 0,
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 4,
    ...Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.12,
            shadowRadius: 15,
        },
        android: {
            elevation: 5,
            shadowColor: '#000',
        },
    }),
};

const styles = StyleSheet.create({
    tabBar: tabBarStyleObject,
    tabBarItem: {
        paddingVertical: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 44,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    activeTabBg: {
        backgroundColor: '#F1F5F9',
    },
});