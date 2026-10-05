import { Image, type ImageContentFit } from 'expo-image';
import React, { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from './Icon';

/**
 * Cached network image with calm placeholder/error states (Flutter
 * `AppNetworkImage`). expo-image caches to memory + disk by default.
 */
export function AppNetworkImage({
  url,
  width,
  height,
  fit = 'cover',
  borderRadius,
  placeholder,
  error,
  style,
}: {
  url: string;
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  fit?: ImageContentFit;
  borderRadius?: number;
  placeholder?: React.ReactNode;
  error?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const box: StyleProp<ViewStyle> = [{ width, height, borderRadius, overflow: 'hidden', backgroundColor: '#EDEFF3' }, style];
  if (!url || failed) {
    return (
      <View style={[box, { alignItems: 'center', justifyContent: 'center' }]}>
        {error ?? <Icon name="image" size={34} color="#BDBDBD" />}
      </View>
    );
  }
  return (
    <View style={box}>
      {!loaded && placeholder ? <View style={{ position: 'absolute', inset: 0 } as ViewStyle}>{placeholder}</View> : null}
      <Image
        source={{ uri: url }}
        style={{ width: '100%', height: '100%' }}
        contentFit={fit}
        cachePolicy="memory-disk"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        transition={150}
      />
    </View>
  );
}
