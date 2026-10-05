import React from 'react';
import { Pressable, View } from 'react-native';

import { RouteNames } from '@/core/router/routeNames';
import { push } from '@/core/router/nav';
import { grey, themeColor } from '@/core/theme/colors';
import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';
import { useAadhaarStatus } from '@/features/onboarding/aadhaar/aadhaar';
import { openProfileDrawer } from '../providers/drawerStore';
import { HomeAvatar, HomeColors } from './homePrimitives';

const headerFill = '#EFF1F6';

/** Home top bar: Search field → Bell with unread dot → ringed avatar (opens drawer). */
export function HomeAppBar({ userName, avatarUrl = '' }: { userName: string; avatarUrl?: string }) {
  // The tick means Aadhaar-verified identity, nothing else.
  const verified = useAadhaarStatus().data?.verified === true;
  return (
    <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
      <Pressable
        onPress={() => push(RouteNames.search)}
        style={{ flex: 1, height: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: headerFill, flexDirection: 'row', alignItems: 'center' }}
      >
        <Icon name="search" size={20} color={grey[600]} />
        <Text style={{ marginLeft: 10, fontSize: 15, color: grey[600] }}>Search</Text>
      </Pressable>
      <Pressable onPress={() => push(RouteNames.notifications)} style={{ marginLeft: 12, width: 44, height: 44 }} accessibilityLabel="Notifications">
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: headerFill, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="notifications-none" size={22} color="#3F4144" />
        </View>
        <View
          style={{
            position: 'absolute',
            top: 3,
            right: 3,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: HomeColors.unread,
            borderWidth: 2,
            borderColor: '#FFFFFF',
          }}
        />
      </Pressable>
      <Pressable onPress={openProfileDrawer} style={{ marginLeft: 12, padding: 2, borderRadius: 24, borderWidth: 2, borderColor: themeColor }} accessibilityLabel="Profile menu">
        <HomeAvatar name={userName} assetPath={avatarUrl} size={36} />
        {verified ? (
          <View style={{ position: 'absolute', right: -4, bottom: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={10} color="#FFFFFF" />
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}
