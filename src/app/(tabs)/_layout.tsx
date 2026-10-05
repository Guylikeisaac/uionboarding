import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { push } from '@/core/router/nav';
import { RouteNames } from '@/core/router/routeNames';
import { AppBottomNavBar } from '@/features/home/widgets/AppBottomNavBar';
import { JobApplyCompletionListener } from '@/features/jobs/widgets/JobApplyCompletionListener';
import { ProfileDrawerHost } from '@/features/profileMenu/widgets/ProfileDrawer';

/** Home shell: four tab stacks, notched bottom bar + centre FAB, left profile drawer. */
export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Tabs
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#FFFFFF' } }}
        tabBar={(props) => <AppBottomNavBar {...props} onFabPress={() => push(RouteNames.postComposer)} />}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="network" />
        <Tabs.Screen name="jobs" />
        <Tabs.Screen name="messages" />
      </Tabs>
      <JobApplyCompletionListener />
      <ProfileDrawerHost />
    </View>
  );
}
