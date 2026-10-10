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

  it('loads every page of projects', async () => {
    const firstPage = Array.from({ length: 50 }, (_, index) => ({
      id: index + 1,
      name: `Project ${index + 1}`,
    }));
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: firstPage,
          pages: { page: 1, total_pages: 2, next: 2 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [{ id: 51, name: 'Project 51' }],
          pages: { page: 2, total_pages: 2, next: null },
        }),
      });

    const projects = await createService().listProjects();

    expect(projects).toHaveLength(51);
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://api.postmypost.io/v4.1/projects?per_page=50&page=2',
      expect.any(Object),
    );
  });

  it('retries a temporary GET failure', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: new Headers({ 'retry-after': '0' }),
        text: jest.fn().mockResolvedValue('temporarily unavailable'),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: [{ id: 12, name: 'Main project' }] }),
      });

    await expect(createService().listProjects()).resolves.toEqual([
      { id: 12, name: 'Main project' },
    ]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('reports rate limits without repeatedly hitting the API', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ 'retry-after': '42' }),
      text: jest.fn().mockResolvedValue('too many requests'),
    });

    await expect(createService().listProjects()).rejects.toThrow('retry after 42 seconds');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('uploads a public clip URL and schedules it as a short video', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [
            { id: 10, name: 'YouTube', connection_status: 1 },
            { id: 11, name: 'TikTok', connection_status: 1 },
          ],
        }),
      })
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
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.postmypost.io/v4.1/accounts?project_id=5&per_page=50',
    );
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.postmypost.io/v4.1/upload/init');
    expect(JSON.parse(String(fetchMock.mock.calls[1][1].body))).toEqual({
      project_id: 5,
      url: 'https://media.example/clip.mp4',
    });
    expect(fetchMock.mock.calls[2][0]).toBe('https://api.postmypost.io/v4.1/upload/status?id=41');
    expect(JSON.parse(String(fetchMock.mock.calls[3][1].body))).toEqual(
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

  it('does not upload when any selected account is disconnected', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: [
          { id: 10, name: 'YouTube', connection_status: 1 },
          { id: 11, name: 'TikTok', connection_status: 2 },
        ],
      }),
    });

    await expect(
      createService().scheduleVideo({
        projectId: 5,
        accountIds: [10, 11],
        videoUrl: 'https://media.example/clip.mp4',
        scheduledAt: new Date('2026-10-10T09:00:00.000Z'),
      }),
    ).rejects.toThrow('TikTok: account is not connected');

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
