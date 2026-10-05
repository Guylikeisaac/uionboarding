import React from 'react';
import { FlatList, Pressable, useWindowDimensions, View } from 'react-native';

import { accentPurpleLight, grey, textMuted, textPrimary, themeColor } from '@/core/theme/colors';
import { Text } from '@/shared/ui/Text';
import type { PeopleModuleData, PersonSuggestion } from '../data/homeModels';
import { HomeAvatar, homeCardShadow, ModulePanel } from './homePrimitives';

/** "People you may know" panel with a horizontal carousel of person cards. */
export function PeopleModule({
  data,
  onSeeAll,
  onToggleConnect,
  onTapPerson,
}: {
  data: PeopleModuleData;
  onSeeAll: () => void;
  onToggleConnect: (personId: string) => void;
  onTapPerson?: (person: PersonSuggestion) => void;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = width * 0.44;
  return (
    <ModulePanel title={data.title} seeAllLabel={data.seeAllLabel} onSeeAll={onSeeAll}>
      {data.people.length === 0 ? (
        <Text style={{ paddingHorizontal: 16, paddingVertical: 20, textAlign: 'center', fontSize: 13, color: textMuted }}>
          No suggestions yet. Add your skills and experience to find people.
        </Text>
      ) : (
        <FlatList
          horizontal
          data={data.people}
          keyExtractor={(p) => p.id}
          showsHorizontalScrollIndicator={false}
          style={{ height: 248 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          renderItem={({ item }) => (
            <PersonCard
              person={item}
              width={cardWidth}
              onToggleConnect={() => onToggleConnect(item.id)}
              onTap={onTapPerson && item.userId ? () => onTapPerson(item) : undefined}
            />
          )}
        />
      )}
    </ModulePanel>
  );
}

function PersonCard({
  person,
  width,
  onToggleConnect,
  onTap,
}: {
  person: PersonSuggestion;
  width: number;
  onToggleConnect: () => void;
  onTap?: () => void;
}) {
  const sub = { fontSize: 12.5, color: grey[600], textAlign: 'center' as const };
  return (
    <Pressable onPress={onTap} disabled={!onTap} style={[{ width, padding: 14, backgroundColor: '#FFFFFF', borderRadius: 16, alignItems: 'center', alignSelf: 'flex-start' }, homeCardShadow]}>
      <HomeAvatar name={person.name} assetPath={person.avatarAsset} size={64} />
      <Text numberOfLines={1} style={{ marginTop: 10, fontSize: 15, fontWeight: '700', color: textPrimary }}>
        {person.name}
      </Text>
      <Text numberOfLines={1} style={[sub, { marginTop: 2 }]}>
        {person.role}
      </Text>
      <Text numberOfLines={1} style={sub}>
        {person.company}
      </Text>
      <Text numberOfLines={1} style={{ marginTop: 6, fontSize: 12.5, fontWeight: '600', color: themeColor }}>
        {person.mutualLabel ?? `${person.mutualCount} mutual`}
      </Text>
      <Pressable
        onPress={onToggleConnect}
        style={({ pressed }) => ({
          marginTop: 10,
          alignSelf: 'stretch',
          height: 38,
          borderRadius: 19,
          backgroundColor: accentPurpleLight,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: themeColor }}>{person.connected ? 'Pending' : 'Connect'}</Text>
      </Pressable>
    </Pressable>
  );
}
