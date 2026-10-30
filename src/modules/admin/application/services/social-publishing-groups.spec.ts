import {
  selectPublishingGroup,
  PublishingGroup,
  PublishingGroupPolicy,
} from './social-publishing-groups';

function sequence(
  policy: PublishingGroupPolicy,
  count: number,
  available = { own: true, youtube: true },
) {
  const result: PublishingGroup[] = [];
  for (let i = 0; i < count; i++) {
    const choice = selectPublishingGroup(policy, available);
    if (!choice) break;
    result.push(choice.group);
    policy = { ...policy, groupCursor: choice.nextCursor };
  }
  return result;
}

describe('Persistent publishing group order', () => {
  const both: PublishingGroup[] = ['own', 'youtube'];
  it('keeps legacy rules own-only; downloading YouTube never opts a rule in', () => {
    expect(sequence({}, 3)).toEqual(['own', 'own', 'own']);
    expect(sequence({}, 3, { own: false, youtube: true })).toEqual([]);
  });
  it('alternates and supports a chosen first group', () => {
    expect(sequence({ sourceGroups: both }, 4)).toEqual(['own', 'youtube', 'own', 'youtube']);
    expect(sequence({ sourceGroups: both, firstGroup: 'youtube' }, 4)).toEqual([
      'youtube',
      'own',
      'youtube',
      'own',
    ]);
  });
  it('persists 2:1 order across service restarts using the saved cursor', () => {
    const policy: PublishingGroupPolicy = {
      sourceGroups: both,
      groupStrategy: 'ratio',
      ownPerCycle: 2,
      youtubePerCycle: 1,
    };
    expect(sequence(policy, 6)).toEqual(['own', 'own', 'youtube', 'own', 'own', 'youtube']);
    expect(sequence({ ...policy, groupCursor: 2 }, 3)).toEqual(['youtube', 'own', 'own']);
  });
  it.each(['own', 'youtube'] as const)(
    'keeps using %s when the other pool is empty, then resumes its missing turn',
    group => {
      const available = { own: group === 'own', youtube: group === 'youtube' };
      const policy: PublishingGroupPolicy = {
        sourceGroups: both,
        groupCursor: group === 'own' ? 1 : 0,
      };
      expect(sequence(policy, 4, available)).toEqual([group, group, group, group]);
      const fallback = selectPublishingGroup(policy, available)!;
      expect(fallback.nextCursor).toBe(policy.groupCursor);
      expect(
        selectPublishingGroup(
          { ...policy, groupCursor: fallback.nextCursor },
          { own: true, youtube: true },
        )?.group,
      ).toBe(group === 'own' ? 'youtube' : 'own');
    },
  );
  it('supports strict waiting, both-empty, a single YouTube pool and priorities', () => {
    expect(
      selectPublishingGroup(
        { sourceGroups: both, fallbackToOtherGroup: false },
        { own: false, youtube: true },
      ),
    ).toBeNull();
    expect(
      selectPublishingGroup({ sourceGroups: both }, { own: false, youtube: false }),
    ).toBeNull();
    expect(sequence({ sourceGroups: ['youtube'] }, 3)).toEqual(['youtube', 'youtube', 'youtube']);
    expect(sequence({ sourceGroups: both, groupStrategy: 'own_first' }, 3)).toEqual([
      'own',
      'own',
      'own',
    ]);
    expect(sequence({ sourceGroups: both, groupStrategy: 'youtube_first' }, 3)).toEqual([
      'youtube',
      'youtube',
      'youtube',
    ]);
  });
});
