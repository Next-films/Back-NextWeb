import { PostMyPostPublishingService } from '@/admin/application/services/postmypost-publishing.service';

describe('PostMyPostPublishingService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const createService = () => {
    const externalApiConfigService = {
      getActiveConfig: jest.fn().mockResolvedValue({
        baseUrl: 'https://api.postmypost.io/v4.1/',
        token: 'test-token',
      }),
    };

    return new PostMyPostPublishingService(externalApiConfigService as never);
  };

  it('loads projects with bearer authentication', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [{ id: 12, name: 'Main project' }] }),
    });

    await expect(createService().listProjects()).resolves.toEqual([
      { id: 12, name: 'Main project' },
    ]);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.postmypost.io/v4.1/projects?per_page=50',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('uploads a public clip URL and schedules it as a short video', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 41 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 41, status: 1, file_id: 73 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 99, publication_status: 5 }),
      });

    await expect(
      createService().scheduleVideo({
        projectId: 5,
        accountIds: [10, 11],
        videoUrl: 'https://media.example/clip.mp4',
        scheduledAt: new Date('2026-10-10T09:00:00.000Z'),
        title: 'Title',
        caption: 'Caption',
      }),
    ).resolves.toEqual({
      externalPublicationId: '99',
      raw: { id: 99, publication_status: 5 },
    });

    const fetchMock = global.fetch as jest.Mock;
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.postmypost.io/v4.1/upload/init');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toEqual({
      project_id: 5,
      url: 'https://media.example/clip.mp4',
    });
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.postmypost.io/v4.1/upload/status?id=41');
    expect(JSON.parse(String(fetchMock.mock.calls[2][1].body))).toEqual(
      expect.objectContaining({
        project_id: 5,
        post_at: '2026-10-10T09:00:00.000Z',
        account_ids: [10, 11],
        publication_status: 5,
        details: [
          expect.objectContaining({
            publication_type: 4,
            file_ids: [73],
            title: 'Title',
            content: 'Caption',
          }),
        ],
      }),
    );
  });
});
