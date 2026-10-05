import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { basename, type PickedFile } from '@/core/files/pickedFile';
import { accentRed, textMuted } from '@/core/theme/colors';
import { Icon, type IconName } from '@/shared/ui/Icon';

/** Opens the gallery for a single image. Resolves undefined when cancelled. */
export async function pickImageFromGallery(opts: { quality?: number } = {}): Promise<PickedFile | undefined> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: opts.quality ?? 0.88,
  });
  if (res.canceled || !res.assets?.length) return undefined;
  const a = res.assets[0];
  return { uri: a.uri, name: a.fileName ?? basename(a.uri), mimeType: a.mimeType ?? undefined, size: a.fileSize ?? undefined };
}

/**
 * Circular avatar picker shown above the name fields on account creation.
 * The local file wins over a remote [photoUrl] (Google) when both are present.
 */
export function ProfilePhotoPicker({
  photoUrl,
  photoFile,
  onPicked,
  onRemoved,
  size = 96,
}: {
  photoUrl?: string;
  photoFile?: PickedFile;
  onPicked: (f: PickedFile) => void;
  onRemoved: () => void;
  size?: number;
}) {
  const uri = photoFile?.uri ?? (photoUrl ? photoUrl : undefined);
  const hasPhoto = !!uri;
  const pick = async () => {
    const f = await pickImageFromGallery();
    if (f) onPicked(f);
  };
  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable
        onPress={pick}
        accessibilityLabel="Add profile photo"
        style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(255,255,255,0.06)' }]}
      >
        {hasPhoto ? (
          <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />
        ) : (
          <Icon name="add-photo-alternate" size={28} color={textMuted} />
        )}
      </Pressable>
      {hasPhoto ? (
        <View style={styles.actions}>
          <Chip icon="edit" color="#FFFFFF" label="Change photo" onTap={pick} />
          <View style={{ width: 10 }} />
          <Chip icon="delete-outline" color={accentRed} label="Remove photo" onTap={onRemoved} />
        </View>
      ) : null}
    </View>
  );
}

function Chip({ icon, color, label, onTap }: { icon: IconName; color: string; label: string; onTap: () => void }) {
  return (
    <Pressable onPress={onTap} accessibilityLabel={label} style={styles.chip}>
      <Icon name={icon} size={16} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  actions: { flexDirection: 'row', marginTop: 10 },
  chip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
