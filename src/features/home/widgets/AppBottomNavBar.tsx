import type { BottomTabBarProps } from 'expo-router/tabs';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { themeColor } from '@/core/theme/colors';
import { Text } from '@/shared/ui/Text';

export const kNavBarHeight = 64;
const FAB_SLOT = 76;
const NOTCH_RADIUS = 30;
const NOTCH_MARGIN = 4;
const NOTCH_CENTER_DY = 20;
const CORNER = 24;
const inactiveLabel = '#45484C';

const tabMeta: Record<string, { label: string; active: number; inactive: number }> = {
  home: { label: 'Home', active: require('../../../../assets/icons/home_tapped.png'), inactive: require('../../../../assets/icons/home.png') },
  network: { label: 'Network', active: require('../../../../assets/icons/network_tapped.png'), inactive: require('../../../../assets/icons/network.png') },
  jobs: { label: 'Jobs', active: require('../../../../assets/icons/job_tapped.png'), inactive: require('../../../../assets/icons/job.png') },
  messages: { label: 'Message', active: require('../../../../assets/icons/chat_tapped.png'), inactive: require('../../../../assets/icons/chat.png') },
};

/** White bar with rounded top corners and a circular notch cut for the centre FAB. */
function barPath(w: number, h: number): string {
  const r = NOTCH_RADIUS + NOTCH_MARGIN;
  const cx = w / 2;
  // Where the notch circle (centre dy below the top edge) crosses y = 0.
  const dx = Math.sqrt(Math.max(0, r * r - NOTCH_CENTER_DY * NOTCH_CENTER_DY));
  return [
    `M0 ${CORNER}`,
    `Q0 0 ${CORNER} 0`,
    `L${cx - dx} 0`,
    `A${r} ${r} 0 0 0 ${cx + dx} 0`,
    `L${w - CORNER} 0`,
    `Q${w} 0 ${w} ${CORNER}`,
    `L${w} ${h}`,
    `L0 ${h}`,
    'Z',
  ].join(' ');
}

/** Bottom nav: Home · Network · [FAB slot] · Jobs · Message, drawn over the content. */
export function AppBottomNavBar({ state, navigation, onFabPress }: BottomTabBarProps & { onFabPress: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const height = kNavBarHeight + insets.bottom;

  const routes = state.routes.filter((r) => tabMeta[r.name]);
  const item = (routeName: string) => {
    const index = state.routes.findIndex((r) => r.name === routeName);
    const route = state.routes[index];
    if (!route) return <View style={{ flex: 1 }} />;
    const focused = state.index === index;
    const meta = tabMeta[routeName];
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
    };
    return (
      <Pressable key={route.key} onPress={onPress} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={meta.label}>
        <Image source={focused ? meta.active : meta.inactive} style={{ width: 26, height: 26 }} contentFit="contain" />
        <Text style={{ marginTop: 4, fontSize: 11, fontWeight: focused ? '600' : '500', color: focused ? themeColor : inactiveLabel }}>{meta.label}</Text>
      </Pressable>
    );
  };

  if (routes.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { height: height + 28 }]}>
      <View style={[styles.shadow, { top: 28, height }]}>
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Path d={barPath(width, height)} fill="#FFFFFF" />
        </Svg>
        <View style={{ flexDirection: 'row', height: kNavBarHeight }}>
          {item('home')}
          {item('network')}
          <View style={{ width: FAB_SLOT }} />
          {item('jobs')}
          {item('messages')}
        </View>
      </View>
      <NavCenterFab onTap={onFabPress} left={width / 2 - 46} />
    </View>
  );
}

/** 92px white cradle disc with the 66px brand "+" button. */
function NavCenterFab({ onTap, left }: { onTap: () => void; left: number }) {
  return (
    <View style={{ position: 'absolute', top: 0, left, width: 92, height: 92, borderRadius: 46, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
      <Pressable
        onPress={onTap}
        accessibilityLabel="Create post"
        style={({ pressed }) => ({
          transform: [{ translateY: -2 }],
          width: 66,
          height: 66,
          borderRadius: 33,
          backgroundColor: themeColor,
          opacity: pressed ? 0.88 : 1,
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        <Image source={require('../../../../assets/icons/plus_icon.png')} style={{ width: 22, height: 22 }} tintColor="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: -3 },
    elevation: 0,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
