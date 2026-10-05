import React from 'react';
import { Pressable, View } from 'react-native';

import { grey, themeColor } from '@/core/theme/colors';
import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';
import type { GreetingBannerData } from '../data/homeModels';
import { HomeColors } from './homePrimitives';

/** Outlined greeting/jobs-nudge card (first scrolling item). */
export function GreetingBanner({ data, onTapCta }: { data: GreetingBannerData; onTapCta: () => void }) {
  const greeting = (data.firstName ? `${data.greetingPrefix}, ${data.firstName} ${data.emoji}` : `${data.greetingPrefix} ${data.emoji}`).trim();
  return (
    <View style={{ margin: 12, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: HomeColors.bannerBorder }}>
      <Text style={{ fontSize: 13.5, color: grey[600] }}>{greeting}</Text>
      <Text style={{ marginTop: 6, fontSize: 17, fontWeight: '700', color: '#484651' }}>{data.headline}</Text>
      <Pressable onPress={onTapCta} style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }} hitSlop={6}>
        <Text style={{ color: themeColor, fontWeight: '600', fontSize: 14 }}>{data.ctaLabel}</Text>
        <Icon name="arrow-forward" color={themeColor} size={16} style={{ marginLeft: 4 }} />
      </Pressable>
    </View>
  );
}
