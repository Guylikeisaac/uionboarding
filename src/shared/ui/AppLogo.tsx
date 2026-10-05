import { Image } from 'expo-image';
import React from 'react';

import { AppAssets } from '@/core/utils/appAssets';

/**
 * Full-brand horizontal logo — the SyncUp "S" icon + wordmark in one image.
 * [size] is the rendered width; height keeps the image's aspect ratio.
 */
export function AppLogo({ size = 160 }: { size?: number }) {
  return (
    <Image
      source={AppAssets.syncupLogoUpdatedBlue}
      style={{ width: size, aspectRatio: 6323 / 2000 }}
      contentFit="contain"
    />
  );
}
