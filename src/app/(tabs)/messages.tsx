import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ComingSoonView } from '@/shared/ui/ComingSoonView';

/** Messaging is feature-gated (kMessagingEnabled = false): honest pending state. */
export default function MessagesTab() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: insets.top }}>
      <ComingSoonView icon="forum" title="Messaging is coming soon" />
    </View>
  );
}
