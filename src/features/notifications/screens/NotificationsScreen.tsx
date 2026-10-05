import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RepositoryException } from '@/core/data/repositoryException';
import { pop, push } from '@/core/router/nav';
import { RouteNames } from '@/core/router/routeNames';
import { themeColor } from '@/core/theme/colors';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';
import { AppUserAvatar } from '@/shared/ui/UserAvatar';
import { notificationIsSystem, useNotifications, type NotificationItem, type NotificationKind } from '../data/notifications';

export const NotifColors = {
  page: '#FFFFFF',
  control: '#EFF1F6',
  unread: '#ECEBFD',
  cardBorder: '#EDEDF2',
  ink: '#111111',
  sectionLabel: '#9AA0A6',
  message: '#6B7280',
  time: '#9AA0A6',
  systemSurface: '#FCE9BF',
  systemIcon: '#D97706',
};

const badge: Record<NotificationKind, [IconName, string]> = {
  like: ['favorite', '#E3352A'],
  comment: ['chat-bubble', themeColor],
  connection: ['person-add-alt-1', themeColor],
  jobMatch: ['work', NotifColors.systemIcon],
  generic: ['notifications', themeColor],
};

/** Notifications (inside the Home tab stack, so the bottom nav stays visible). */
export function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const q = useNotifications();

  const onTap = (item: NotificationItem) => {
    if (item.actorHandle) push(RouteNames.profilePublic, { userId: item.actorHandle });
  };

  let body: React.ReactNode;
  if (q.isPending) {
    body = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={themeColor} />
      </View>
    );
  } else if (q.isError) {
    body = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Icon name="error-outline" size={40} color={NotifColors.sectionLabel} />
        <Text style={{ marginTop: 12, textAlign: 'center', color: NotifColors.message }}>
          {q.error instanceof RepositoryException ? q.error.message : 'Could not load notifications.'}
        </Text>
        <Pressable onPress={() => void q.refetch()} style={{ marginTop: 16, paddingHorizontal: 22, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: '#C9CBD3' }}>
          <Text style={{ color: themeColor, fontWeight: '600' }}>Retry</Text>
        </Pressable>
      </View>
    );
  } else {
    const groups = q.data.groups;
    body = (
      <ScrollView
        contentContainerStyle={groups.length ? { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 110 } : { paddingHorizontal: 24, paddingTop: 90, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={themeColor} colors={[themeColor]} />}
      >
        {groups.length === 0 ? (
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: NotifColors.unread, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="notifications-none" size={34} color="#6C63FF" />
            </View>
            <Text style={{ marginTop: 20, fontSize: 20, fontWeight: '700', color: NotifColors.ink }}>{"You're all caught up"}</Text>
            <Text style={{ marginTop: 10, textAlign: 'center', fontSize: 14.5, lineHeight: 20, color: NotifColors.message }}>
              New likes, comments, connections and job matches will show up here.
            </Text>
          </View>
        ) : (
          groups.map((g) => (
            <View key={g.label} style={{ marginBottom: 8 }}>
              <Text style={{ paddingHorizontal: 2, paddingTop: 4, paddingBottom: 12, fontSize: 14, fontWeight: '500', color: NotifColors.sectionLabel }}>{g.label}</Text>
              {g.items.map((item) => (
                <NotificationCard key={item.id} item={item} onTap={() => onTap(item)} />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: NotifColors.page, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => pop(RouteNames.home)} accessibilityLabel="Back" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: NotifColors.control, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrow-back" size={19} color="#1F2430" />
        </Pressable>
        <Text style={{ marginLeft: 14, fontSize: 22, fontWeight: '700', color: NotifColors.ink }}>Notifications</Text>
      </View>
      {body}
    </View>
  );
}

function NotificationCard({ item, onTap }: { item: NotificationItem; onTap: () => void }) {
  const [icon, color] = badge[item.kind];
  return (
    <Pressable
      onPress={onTap}
      style={{
        marginBottom: 12,
        paddingLeft: 12,
        paddingRight: 4,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: item.isUnread ? 'transparent' : NotifColors.cardBorder,
        backgroundColor: item.isUnread ? NotifColors.unread : '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {notificationIsSystem(item) ? (
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: NotifColors.systemSurface, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="work-outline" size={22} color={NotifColors.systemIcon} />
        </View>
      ) : (
        <View style={{ width: 44, height: 44 }}>
          <AppUserAvatar name={item.name} avatarUrl={item.avatarUrl} size={44} />
          <View style={{ position: 'absolute', bottom: -2, left: -2, padding: 2.5, borderRadius: 12, backgroundColor: '#FFFFFF' }}>
            <Icon name={icon} size={13} color={color} />
          </View>
        </View>
      )}
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text numberOfLines={3} style={{ fontSize: 14.5, lineHeight: 18.9 }}>
          <Text style={{ color: NotifColors.ink, fontWeight: '700' }}>{item.name}</Text>
          <Text style={{ color: NotifColors.message }}> {item.message}</Text>
        </Text>
        <Text style={{ marginTop: 4, fontSize: 12.5, color: NotifColors.time }}>{item.time}</Text>
      </View>
      <View style={{ width: 32, height: 40, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="more-vert" size={20} color="#6B7280" />
      </View>
    </Pressable>
  );
}
