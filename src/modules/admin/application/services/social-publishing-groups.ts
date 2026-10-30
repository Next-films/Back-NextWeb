export type PublishingGroup = 'own' | 'youtube';
export type PublishingStrategy = 'alternate' | 'ratio' | 'own_first' | 'youtube_first';

export type PublishingGroupPolicy = {
  sourceGroups?: PublishingGroup[];
  groupStrategy?: PublishingStrategy;
  firstGroup?: PublishingGroup;
  ownPerCycle?: number;
  youtubePerCycle?: number;
  fallbackToOtherGroup?: boolean;
  groupCursor?: number;
};

/** Called while the publishing-rule row is locked. Empty pools never consume their turn. */
export function selectPublishingGroup(
  policy: PublishingGroupPolicy,
  available: Record<PublishingGroup, boolean>,
): { group: PublishingGroup; nextCursor: number } | null {
  const groups = policy.sourceGroups ?? ['own'];
  const enabled = (group: PublishingGroup) => groups.includes(group) && available[group];
  const cursor = policy.groupCursor ?? 0;
  if (groups.length === 1)
    return enabled(groups[0]) ? { group: groups[0], nextCursor: cursor } : null;
  const strategy = policy.groupStrategy ?? 'alternate';
  let sequence: PublishingGroup[];
  if (strategy === 'own_first' || strategy === 'youtube_first') {
    const preferred = strategy === 'own_first' ? 'own' : 'youtube';
    const other = preferred === 'own' ? 'youtube' : 'own';
    if (enabled(preferred)) return { group: preferred, nextCursor: cursor };
    return policy.fallbackToOtherGroup !== false && enabled(other)
      ? { group: other, nextCursor: cursor }
      : null;
  }
  const ownCount = strategy === 'ratio' ? policy.ownPerCycle ?? 1 : 1;
  const youtubeCount = strategy === 'ratio' ? policy.youtubePerCycle ?? 1 : 1;
  sequence = [
    ...Array<PublishingGroup>(ownCount).fill('own'),
    ...Array<PublishingGroup>(youtubeCount).fill('youtube'),
  ];
  if (policy.firstGroup === 'youtube')
    sequence = [...sequence.slice(ownCount), ...sequence.slice(0, ownCount)];
  const position = cursor % sequence.length;
  const preferred = sequence[position];
  if (enabled(preferred)) return { group: preferred, nextCursor: (position + 1) % sequence.length };
  const other = preferred === 'own' ? 'youtube' : 'own';
  return policy.fallbackToOtherGroup !== false && enabled(other)
    ? { group: other, nextCursor: position }
    : null;
}
