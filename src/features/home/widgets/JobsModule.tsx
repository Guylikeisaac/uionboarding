import React from 'react';
import { Pressable, View } from 'react-native';

import { grey, textMuted, textPrimary, themeColor } from '@/core/theme/colors';
import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';
import type { JobItem, JobsModuleData } from '../data/homeModels';
import { LogoTile, ModulePanel } from './homePrimitives';

/** "Jobs for you" gray panel holding stacked white job cards. */
export function JobsModule({
  data,
  onSeeAll,
  onToggleSave,
  onTapJob,
}: {
  data: JobsModuleData;
  onSeeAll: () => void;
  onToggleSave: (jobId: string) => void;
  onTapJob: (jobId: string) => void;
}) {
  return (
    <ModulePanel title={data.title} seeAllLabel={data.seeAllLabel} onSeeAll={onSeeAll}>
      <View style={{ paddingHorizontal: 16 }}>
        {data.jobs.length === 0 ? (
          // Never put placeholder jobs here.
          <Text style={{ paddingVertical: 20, textAlign: 'center', fontSize: 13, color: textMuted }}>
            No job matches yet. Complete your profile to get better matches.
          </Text>
        ) : (
          data.jobs.map((job, i) => (
            <View key={job.id} style={{ marginBottom: i === data.jobs.length - 1 ? 0 : 12 }}>
              <JobCard job={job} onTap={() => onTapJob(job.id)} onToggleSave={() => onToggleSave(job.id)} />
            </View>
          ))
        )}
      </View>
    </ModulePanel>
  );
}

function JobCard({ job, onTap, onToggleSave }: { job: JobItem; onTap: () => void; onToggleSave: () => void }) {
  const sub = { fontSize: 13, color: grey[600] };
  return (
    <Pressable
      onPress={onTap}
      style={({ pressed }) => ({ backgroundColor: pressed ? '#F7F7FA' : '#FFFFFF', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center' })}
    >
      <LogoTile company={job.company} assetPath={job.logoAsset} size={56} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text numberOfLines={1} style={{ fontSize: 15.5, fontWeight: '700', color: textPrimary }}>
          {job.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Text numberOfLines={1} style={[sub, { flexShrink: 1 }]}>
            {job.company}
          </Text>
          <Text style={sub}>{'  ·  '}</Text>
          <Icon name="place" size={14} color={grey[600]} />
          <Text numberOfLines={1} style={[sub, { marginLeft: 2, flexShrink: 1 }]}>
            {job.location}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#F0F0FF', borderRadius: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: themeColor }}>{job.employmentType}</Text>
          </View>
          <Text style={{ marginLeft: 10, fontSize: 13, color: grey[700] }}>{job.salaryRange}</Text>
        </View>
      </View>
      <Pressable onPress={onToggleSave} hitSlop={10} style={{ marginLeft: 6 }}>
        <Icon name={job.savedByMe ? 'bookmark' : 'bookmark-border'} size={20} color={job.savedByMe ? themeColor : grey[500]} />
      </Pressable>
    </Pressable>
  );
}
