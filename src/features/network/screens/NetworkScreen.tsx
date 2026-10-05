import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/core/auth/authManager';
import { sanitizeAvatarUrl } from '@/core/helpers/avatarUrl';
import { themeColor } from '@/core/theme/colors';
import { HomeAppBar } from '@/features/home/widgets/HomeAppBar';
import { ComingSoonView } from '@/shared/ui/ComingSoonView';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';
import type { NetworkTab } from '../data/networkModels';
import { useNetworkContent } from '../providers/networkProviders';
import { NetworkColors } from '../widgets/networkPrimitives';
import { PeopleTabSection } from '../widgets/PeopleTab';

const tabs: [NetworkTab, string, IconName][] = [
  ['people', 'People', 'person-outline'],
  ['groups', 'Groups', 'groups'],
  ['events', 'Events', 'calendar-today'],
];

/** Network tab: header (search/bell/avatar, title, segmented tabs) over the tab body. */
export function NetworkScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuth((a) => a.currentUser);
  const { selectedTab, title, subtitle, selectTab } = useNetworkContent();

  return (
    <View style={{ flex: 1, backgroundColor: NetworkColors.header, paddingTop: insets.top }}>
      <HomeAppBar userName={user?.name ?? 'You'} avatarUrl={sanitizeAvatarUrl(user?.profilePic)} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <Text style={{ fontSize: 26, fontWeight: '700', color: NetworkColors.ink }}>{title}</Text>
        <Text style={{ marginTop: 2, fontSize: 14, color: NetworkColors.textSecondary }}>{subtitle}</Text>
        <View style={{ marginTop: 14, height: 46, padding: 4, borderRadius: 14, backgroundColor: NetworkColors.control, flexDirection: 'row' }}>
          {tabs.map(([tab, label, icon]) => {
            const selected = tab === selectedTab;
            const color = selected ? themeColor : NetworkColors.textSecondary;
            return (
              <Pressable
                key={tab}
                onPress={() => selectTab(tab)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={[
                  { flex: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
                  selected && { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
                ]}
              >
                <Icon name={icon} size={17} color={color} />
                <Text style={{ marginLeft: 6, fontSize: 13.5, fontWeight: selected ? '600' : '500', color }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ flex: 1, backgroundColor: NetworkColors.page }}>
        {selectedTab === 'people' ? (
          <PeopleTabSection />
        ) : selectedTab === 'groups' ? (
          <ComingSoonView icon="groups" title="Groups are coming soon" bottomPadding={90} />
        ) : (
          <ComingSoonView icon="event" title="Events are coming soon" bottomPadding={90} />
        )}
      </View>
    </View>
  );
}
