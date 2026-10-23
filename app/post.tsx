import React, { useRef, useState, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { loadExploreFeed } from '../api/integration/newui-gateway';

import PostCard, { PostData } from '../components/PostCard';

export interface PostDetailItem extends PostData {
    id: string;
}

export default function PostScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ postId?: string; initialIndex?: string }>();
    const flatListRef = useRef<FlatList>(null);
    const [posts,setPosts]=useState<PostDetailItem[]>([]);
    const [loadError,setLoadError]=useState('');
    useFocusEffect(useCallback(()=>{
      let active=true;
      void loadExploreFeed().then(cards=>{
        if(!active)return;
        setPosts(cards.filter(c=>c.itemType==='POST').map(c=>({id:c.id,authorId:c.authorId,avatar:c.avatar,username:c.username,images:c.images,tags:c.tags,caption:c.caption,likeCount:c.likeCount,commentCount:c.commentCount,isLiked:c.isLiked,isBookmarked:c.isBookmarked,isFollowing:c.isFollowing})));
        setLoadError('');
      }).catch(e=>{if(active)setLoadError(e instanceof Error?e.message:String(e));});
      return()=>{active=false;};
    },[]));


    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <View style={styles.headerBar}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Octicons name="chevron-left" size={24} color="#0F172A" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>POST</Text>

                <View style={styles.placeholderRight} />
            </View>

            <View style={styles.dashedLine} />
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <FlatList
                ref={flatListRef}
                style={styles.feedList}
                data={params.postId ? posts.filter(p=>p.id===params.postId):posts}
                keyExtractor={(item, index) => item.id ?? index.toString()}
                initialScrollIndex={0}
                onScrollToIndexFailed={(info) => {
                    setTimeout(() => {
                        flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
                    }, 100);
                }}
                ListHeaderComponent={<>{renderHeader()}{loadError?<Text style={{color:'#B91C1C',padding:16}}>{loadError}</Text>:null}</>}
                renderItem={({ item }) => (
                    <View style={styles.cardItemWrapper}>
                        <PostCard
                            {...item}
                            onAuthorPress={item.authorId ? () => router.push({ pathname: '/profilepub', params: { id: item.authorId } }) : undefined}
                            onCommentPress={()=>router.push({pathname:'/comments',params:{postId:item.id}})}
                        />
                    </View>
                )}
                ItemSeparatorComponent={() => <View style={styles.dashedSeparator} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    feedList: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    listContent: {
        paddingHorizontal: 0,
        paddingTop: 16,
        paddingBottom: 40,
        backgroundColor: '#F8FAFC',
    },
    headerContainer: {
        width: '100%',
        backgroundColor: '#F8FAFC',
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
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
    dashedLine: {
        borderBottomWidth: 1,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        marginHorizontal: 24,
        marginBottom: 16,
    },
    dashedSeparator: {
        borderBottomWidth: 1,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        marginHorizontal: 24,
        marginVertical: 12,
    },
    cardItemWrapper: {
        width: '100%',
    },
});