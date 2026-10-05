import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, useWindowDimensions, View } from 'react-native';

import { errorMessage } from '@/core/data/repositoryException';
import { compactCount } from '@/core/helpers/formatCount';
import { push } from '@/core/router/nav';
import { RouteNames } from '@/core/router/routeNames';
import { queryClient } from '@/core/query/queryClient';
import { themeColor } from '@/core/theme/colors';
import { Icon } from '@/shared/ui/Icon';
import { showSnackbar } from '@/shared/ui/snackbar';
import { Text } from '@/shared/ui/Text';
import { personMetricLabel, personSubtitle, requestSubtitle, type ConnectionRequest, type NetworkPerson, type PeopleTabData } from '../data/networkModels';
import { NetworkKeys, peopleNetworkActions, usePeopleNetwork, useSelfConnectionCount } from '../providers/networkProviders';
import {
  NetworkAvatar,
  NetworkCard,
  NetworkColors,
  NetworkIconButton,
  NetworkPillButton,
  networkCardShadow,
  openPersonProfile,
} from './networkPrimitives';

async function run(action: () => Promise<void>, fallback: string) {
  try {
    await action();
  } catch (e) {
    showSnackbar(errorMessage(e, fallback), { isError: true });
  }
}

/** People tab: loading / error / data with pull-to-refresh. */
export function PeopleTabSection() {
  const q = usePeopleNetwork();
  if (q.isPending) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={themeColor} />
      </View>
    );
  }
  if (q.isError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Icon name="group-off" size={40} color={NetworkColors.textTertiary} />
        <Text style={{ marginTop: 12, textAlign: 'center', color: NetworkColors.textSecondary }}>{errorMessage(q.error, 'Could not load your network.')}</Text>
        <View style={{ marginTop: 16 }}>
          <NetworkPillButton label="Retry" filled height={44} onTap={() => void peopleNetworkActions.refresh()} />
        </View>
      </View>
    );
  }
  return (
    <PeopleTabView
      data={q.data}
      refreshing={q.isRefetching}
      onRefresh={() => {
        void queryClient.invalidateQueries({ queryKey: NetworkKeys.accepted });
        void q.refetch();
      }}
      onAccept={(id) => void run(() => peopleNetworkActions.acceptRequest(id), 'Could not accept request.')}
      onToggleConnect={(id) => void run(() => peopleNetworkActions.toggleConnect(id), 'Could not update request.')}
      onSeeAllRequests={() => push(RouteNames.networkConnections, { tab: 'requests' })}
    />
  );
}

function PeopleTabView({
  data,
  refreshing,
  onRefresh,
  onAccept,
  onToggleConnect,
  onSeeAllRequests,
}: {
  data: PeopleTabData;
  refreshing: boolean;
  onRefresh: () => void;
  onAccept: (id: string) => void;
  onToggleConnect: (id: string) => void;
  onSeeAllRequests: () => void;
}) {
  const allEmpty = !data.requests.length && !data.peopleYouMayKnow.length && !data.suggestions.length;
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} colors={[themeColor]} />}
    >
      <ConnectionsEntryCard />
      {allEmpty ? (
        <PeopleEmptyBody />
      ) : (
        <>
          {data.requests.length ? (
            <NetworkCard style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: NetworkColors.ink, marginBottom: 6 }}>Connection Requests</Text>
              {data.requests.map((r, i) => (
                <View key={r.id}>
                  <RequestRow request={r} onAccept={() => onAccept(r.id)} />
                  {i !== data.requests.length - 1 ? <Divider /> : null}
                </View>
              ))}
              <Pressable onPress={onSeeAllRequests} style={{ marginTop: 6, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: themeColor }}>View all requests</Text>
                <Icon name="chevron-right" size={18} color={themeColor} />
              </Pressable>
            </NetworkCard>
          ) : null}
          {data.peopleYouMayKnow.length ? (
            <NetworkCard style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: NetworkColors.ink, marginBottom: 4 }}>People you may know</Text>
              {data.peopleYouMayKnow.map((p, i) => (
                <View key={p.id}>
                  <PersonRow person={p} onToggleConnect={() => onToggleConnect(p.id)} />
                  {i !== data.peopleYouMayKnow.length - 1 ? <Divider /> : null}
                </View>
              ))}
            </NetworkCard>
          ) : null}
          {data.suggestions.length ? (
            <>
              <Text style={{ fontSize: 18, fontWeight: '700', color: NetworkColors.ink, marginBottom: 12 }}>Suggestions</Text>
              <SuggestionsGrid people={data.suggestions} onToggleConnect={onToggleConnect} />
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const Divider = () => <View style={{ height: 1, backgroundColor: NetworkColors.divider }} />;

function ConnectionsEntryCard() {
  const count = useSelfConnectionCount().data;
  return (
    <Pressable
      onPress={() => push(RouteNames.networkConnections, { tab: 'connections' })}
      style={{ marginBottom: 16, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: NetworkColors.chipBorder, backgroundColor: NetworkColors.card, flexDirection: 'row', alignItems: 'center' }}
    >
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: NetworkColors.accentTint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="people-alt" size={19} color={themeColor} />
      </View>
      <Text style={{ flex: 1, marginLeft: 12, fontSize: 15.5, fontWeight: '700', color: NetworkColors.ink }}>Your connections</Text>
      {count != null ? <Text style={{ marginRight: 6, fontSize: 15, fontWeight: '700', color: themeColor }}>{compactCount(count)}</Text> : null}
      <Icon name="chevron-right" size={20} color={NetworkColors.textTertiary} />
    </Pressable>
  );
}

function PeopleEmptyBody() {
  return (
    <View style={{ paddingHorizontal: 8, paddingTop: 64, alignItems: 'center' }}>
      <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: NetworkColors.accentTint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="people-alt" size={34} color={themeColor} />
      </View>
      <Text style={{ marginTop: 20, fontSize: 20, fontWeight: '700', color: NetworkColors.ink }}>No suggestions yet</Text>
      <Text style={{ marginTop: 10, textAlign: 'center', fontSize: 14.5, lineHeight: 20, color: NetworkColors.textSecondary }}>
        {"You're all caught up — we'll surface people to connect with as your network grows."}
      </Text>
    </View>
  );
}

function RequestRow({ request, onAccept }: { request: ConnectionRequest; onAccept: () => void }) {
  return (
    <Pressable onPress={() => openPersonProfile(request.userId)} style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
      <NetworkAvatar name={request.name} imageUrl={request.avatarUrl} size={46} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: NetworkColors.ink }}>
          {request.name}
        </Text>
        <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 13, color: NetworkColors.textSecondary }}>
          {requestSubtitle(request)}
        </Text>
      </View>
      <View style={{ marginLeft: 10 }}>
        <NetworkPillButton label={request.accepted ? 'Accepted' : 'Accept'} filled={request.accepted} showCheck={request.accepted} onTap={request.accepted ? () => {} : onAccept} height={36} />
      </View>
    </Pressable>
  );
}

function PersonRow({ person, onToggleConnect }: { person: NetworkPerson; onToggleConnect: () => void }) {
  const requested = person.status === 'requested';
  return (
    <Pressable onPress={() => openPersonProfile(person.userId)} style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
      <NetworkAvatar name={person.name} imageUrl={person.avatarUrl} size={46} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: NetworkColors.ink }}>
          {person.name}
        </Text>
        <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 12.5, color: NetworkColors.textSecondary }}>
          {personSubtitle(person)}
        </Text>
        <Text style={{ marginTop: 3, fontSize: 12.5, fontWeight: '600', color: themeColor }}>{personMetricLabel(person)}</Text>
      </View>
      <View style={{ marginLeft: 10 }}>
        {person.useIconActions ? (
          <View style={{ flexDirection: 'row' }}>
            <NetworkIconButton icon={requested ? 'check' : 'person-add-alt-1'} onTap={onToggleConnect} />
            <View style={{ width: 8 }} />
            <NetworkIconButton icon="chat-bubble-outline" onTap={() => {}} />
          </View>
        ) : (
          <NetworkPillButton label={requested ? 'Requested' : 'Connect'} onTap={onToggleConnect} height={36} />
        )}
      </View>
    </Pressable>
  );
}

function SuggestionsGrid({ people, onToggleConnect }: { people: NetworkPerson[]; onToggleConnect: (id: string) => void }) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 32 - 14) / 2;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      {people.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => openPersonProfile(p.userId)}
          style={[{ width: cardWidth, marginBottom: 14, padding: 14, backgroundColor: NetworkColors.card, borderRadius: 16, alignItems: 'center' }, networkCardShadow]}
        >
          <NetworkAvatar name={p.name} imageUrl={p.avatarUrl} size={64} />
          <Text numberOfLines={1} style={{ marginTop: 10, fontSize: 15, fontWeight: '700', color: NetworkColors.ink }}>
            {p.name}
          </Text>
          <Text numberOfLines={1} style={{ marginTop: 3, fontSize: 12.5, color: NetworkColors.textSecondary, textAlign: 'center' }}>
            {p.title}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 12.5, color: NetworkColors.textSecondary }}>
            {p.company}
          </Text>
          <Text style={{ marginTop: 6, fontSize: 12.5, fontWeight: '600', color: themeColor }}>{personMetricLabel(p)}</Text>
          <View style={{ marginTop: 12, alignSelf: 'stretch' }}>
            <NetworkPillButton label={p.status === 'requested' ? 'Requested' : 'Connect'} onTap={() => onToggleConnect(p.id)} expand />
          </View>
        </Pressable>
      ))}
    </View>
  );
}
