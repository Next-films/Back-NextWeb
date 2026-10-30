import { AddSocialPublishingGroups1793500000000 } from '../../../../migrations/migrations/1793500000000-add-social-publishing-groups';

describe('Publishing group migration safety', () => {
  it('classifies existing rows as own, preserves old deduplication and adds YouTube identity constraints', async () => {
    const query = jest.fn().mockResolvedValue([]);
    await new AddSocialPublishingGroups1793500000000().up({ query } as never);
    const sql = query.mock.calls.map(([statement]) => statement).join('\n');
    expect(sql).toContain(`"sourceGroups" jsonb NOT NULL DEFAULT '["own"]'::jsonb`);
    expect(sql).toContain(`"sourceGroup" varchar(10) NOT NULL DEFAULT 'own'`);
    expect(sql).toContain('"shortContentJobId" IS NULL AND "youtubeAssetId" IS NOT NULL');
    expect(sql).toContain('"UQ_social_publication_rule_youtube"');
    expect(sql).not.toContain('DROP TABLE');
    expect(sql).not.toContain('DELETE FROM');
  });

  it('refuses a rollback that would destroy YouTube publication history', async () => {
    const query = jest.fn().mockResolvedValue([{ exists: 1 }]);
    await expect(
      new AddSocialPublishingGroups1793500000000().down({ query } as never),
    ).rejects.toThrow('history');
    expect(query).toHaveBeenCalledTimes(1);
  });
});
