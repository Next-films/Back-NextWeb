import * as request from 'supertest';
import { ADMIN_MODERATION_MOVIE_ROUTE } from '@/common/constants/route.constants';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { TEST_MODERATION_APPLY_TASK } from '../../../../data/moderation-tasks.test.data';
import { ModerationTasksApplySuiteContext } from '../apply-moderation-tasks.suite';

export function registerModerationTasksApplyInputValidationSuite({
  getApp,
  getLoginByMainAdmin,
  getAdminModerationTaskUrl,
}: ModerationTasksApplySuiteContext): void {
  it('Admin should not apply task by id, bad input data', async () => {
    const { accessToken } = await getLoginByMainAdmin()();

    const result = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({})
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(result.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'type',
          errorKey: EXCEPTION_KEYS_ENUM.type,
        },
        {
          message: expect.any(String),
          field: 'name',
          errorKey: EXCEPTION_KEYS_ENUM.name,
        },
        {
          message: expect.any(String),
          field: 'kpId',
          errorKey: EXCEPTION_KEYS_ENUM.kpId,
        },
      ],
    });

    const resultProvider = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({ ...TEST_MODERATION_APPLY_TASK, provider: 'provider' })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultProvider.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'provider',
          errorKey: EXCEPTION_KEYS_ENUM.provider,
        },
      ],
    });

    const resultProvider2 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({ ...TEST_MODERATION_APPLY_TASK, provider: '     ' })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultProvider2.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'provider',
          errorKey: EXCEPTION_KEYS_ENUM.provider,
        },
      ],
    });

    const resultProviderId = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({ ...TEST_MODERATION_APPLY_TASK, providerId: '    ' })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultProviderId.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'providerId',
          errorKey: EXCEPTION_KEYS_ENUM.providerId,
        },
      ],
    });

    const resultProviderId2 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        providerId:
          'mkrnjkrfnjkw4njk4bhjb4rhjbr4hjbhfjwbhjffrfbhfjrbhjfhjfrbhjfrbhjbfrhjbhjfrrwbhjfrbhjfrwbhjbfrwhjbhjfrwbhjrwf',
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultProviderId2.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'providerId',
          errorKey: EXCEPTION_KEYS_ENUM.providerId,
        },
      ],
    });

    const resultDescription1 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({ ...TEST_MODERATION_APPLY_TASK, description: '     ' })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultDescription1.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'description',
          errorKey: EXCEPTION_KEYS_ENUM.description,
        },
      ],
    });

    const resultDescription2 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({ ...TEST_MODERATION_APPLY_TASK, description: 'd' })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultDescription2.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'description',
          errorKey: EXCEPTION_KEYS_ENUM.description,
        },
      ],
    });

    const resultDescription3 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        description:
          'djkrnjkrfenjknfrejknfjkerhjefrbhjkferkhjfervjfrevrefvgefrvghrfevfrgvfreghvghfrevghfrevghfrghfervgefrvghrvefghvfegrvgehrfvfgrehvghefrvghfrevghrefvghefrvghfervghfrvghfrevghefrvghfrevgherfvghrefvgvfreghvefrghvfreghvghfrevghfrevghfrevghfrevghfrevghfrevghvefrghvfreghvgfhrerefferjnferhfjerbhjferbhjrfebhjfrehjbfrhjbhjfrebhjefrbhjfrebhjfrebhjferbhjrefhjbfhjrbhjfrhjfrbhjfrebhjferbhjfbrhjbhfjerbhjfrebhjferbhjrfebhfrbehjbfrebjferbhfrehjfrbehjfrebhjbfrehbhjfrebhjfrebhjfrhjfrbehjbfrejh',
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultDescription3.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'description',
          errorKey: EXCEPTION_KEYS_ENUM.description,
        },
      ],
    });

    const resultReleaseDate1 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({ ...TEST_MODERATION_APPLY_TASK, releaseDate: 'd' })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultReleaseDate1.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'releaseDate',
          errorKey: EXCEPTION_KEYS_ENUM.releaseDate,
        },
      ],
    });

    const resultReleaseDate2 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({ ...TEST_MODERATION_APPLY_TASK, releaseDate: '    ' })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultReleaseDate2.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'releaseDate',
          errorKey: EXCEPTION_KEYS_ENUM.releaseDate,
        },
      ],
    });

    const resultOriginalName1 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({ ...TEST_MODERATION_APPLY_TASK, originalName: '    ' })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultOriginalName1.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'originalName',
          errorKey: EXCEPTION_KEYS_ENUM.originalName,
        },
      ],
    });

    const resultOriginalName2 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        originalName:
          'djrfjkhfrhfrsjhfrshbrfbhjfrbhjfhjrbfshrjbhjrfbhjrsfbhjbfrshjbhfrbhjrfsbhjbfsrhjhfjrshjfrsbhjfsrbhjsfrbhjbfrshjhjfrsbhjrsfhjbfrshjfrsbjh',
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultOriginalName2.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'originalName',
          errorKey: EXCEPTION_KEYS_ENUM.originalName,
        },
      ],
    });

    const resultAlternativeName1 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({ ...TEST_MODERATION_APPLY_TASK, alternativeName: '    ' })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultAlternativeName1.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'alternativeName',
          errorKey: EXCEPTION_KEYS_ENUM.alternativeName,
        },
      ],
    });

    const resultAlternativeName2 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        alternativeName:
          'djkrnjkrfenjknfrejknfjkerhjefrbhjkferkhjfervjfrevrefvgefrvghrfevfrgvfreghvghfrevghfrevghfrghfervgefrvghrvefghvfegrvgehrfvfgrehvghefrvghfrevghrefvghefrvghfervghfrvghfrevghefrvghfrevgherfvghrefvgvfreghvefrghvfreghvghfrevghfrevghfrevghfrevghfrevghfrevghvefrghvfreghvgfhrerefferjnferhfjerbhjferbhjrfebhjfrehjbfrhjbhjfrebhjefrbhjfrebhjfrebhjferbhjrefhjbfhjrbhjfrhjfrbhjfrebhjferbhjfbrhjbhfjerbhjfrebhjferbhjrfebhfrbehjbfrebjferbhfrehjfrbehjfrebhjbfrehbhjfrebhjfrebhjfrhjfrbehjbfrejh',
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultAlternativeName2.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'alternativeName',
          errorKey: EXCEPTION_KEYS_ENUM.alternativeName,
        },
      ],
    });

    const resultCountry1 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({ ...TEST_MODERATION_APPLY_TASK, country: ['    ', ['       ']] })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultCountry1.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'country',
          errorKey: EXCEPTION_KEYS_ENUM.country,
        },
      ],
    });

    const resultCountry2 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        country: ['rnjkjkfrnjfrbhjfrbhjrfhjbfhjrbhjrfbhjfrbhjfrhjbfrhjbfrhjfrbrfhbrfhjbhjfrbhjfr'],
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultCountry2.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'country',
          errorKey: EXCEPTION_KEYS_ENUM.country,
        },
      ],
    });

    const resultCountry3 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        country: [{ name: 'Belarus' }],
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultCountry3.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'country',
          errorKey: EXCEPTION_KEYS_ENUM.country,
        },
      ],
    });

    const resultTrailerUrl1 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        trailerUrl: 'trailer',
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultTrailerUrl1.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'trailerUrl',
          errorKey: EXCEPTION_KEYS_ENUM.trailerUrl,
        },
      ],
    });

    const resultTrailerUrl2 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        trailerUrl: '     ',
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultTrailerUrl2.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'trailerUrl',
          errorKey: EXCEPTION_KEYS_ENUM.trailerUrl,
        },
      ],
    });

    const resultPreviewUrl1 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        previewUrl: '     ',
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultPreviewUrl1.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'previewUrl',
          errorKey: EXCEPTION_KEYS_ENUM.previewUrl,
        },
      ],
    });

    const resultPreviewUrl2 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        previewUrl: 'preview',
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultPreviewUrl2.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'previewUrl',
          errorKey: EXCEPTION_KEYS_ENUM.previewUrl,
        },
      ],
    });

    const resultGenres1 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        genres: ['     ', ''],
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultGenres1.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'genres',
          errorKey: EXCEPTION_KEYS_ENUM.genres,
        },
      ],
    });

    const resultGenres2 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        genres: [
          'njknjkvnjkvfnjkvfjknfvdjkvnfjkndfvjknjkfvdnjkfvnjkvfdnjkvfdjkrfhbhfrbhjrfbhjhjfrbhjfrbhjrfbhjbrfhjbhjrfhjfrbhjrfbhj',
          '',
        ],
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultGenres2.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'genres',
          errorKey: EXCEPTION_KEYS_ENUM.genres,
        },
      ],
    });

    const resultGenres3 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        genres: [
          {
            name: 'genre',
          },
        ],
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultGenres3.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'genres',
          errorKey: EXCEPTION_KEYS_ENUM.genres,
        },
      ],
    });

    const resultDuration1 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        duration: 100_000,
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultDuration1.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'duration',
          errorKey: EXCEPTION_KEYS_ENUM.duration,
        },
      ],
    });

    const resultDuration2 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        duration: 'duration',
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultDuration2.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'duration',
          errorKey: EXCEPTION_KEYS_ENUM.duration,
        },
      ],
    });

    const resultVideUrl1 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        videUrl: '     ',
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultVideUrl1.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'videUrl',
          errorKey: EXCEPTION_KEYS_ENUM.videUrl,
        },
      ],
    });

    const resultVideUrl2 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        videUrl: 'video',
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultVideUrl2.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'videUrl',
          errorKey: EXCEPTION_KEYS_ENUM.videUrl,
        },
      ],
    });

    const resultBackgroundContentUrl1 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        backgroundContentUrl: 'backgroundContentUrl',
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultBackgroundContentUrl1.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'backgroundContentUrl',
          errorKey: EXCEPTION_KEYS_ENUM.backgroundContentUrl,
        },
      ],
    });

    const resultBackgroundContentUrl2 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        backgroundContentUrl: '      ',
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultBackgroundContentUrl2.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'backgroundContentUrl',
          errorKey: EXCEPTION_KEYS_ENUM.backgroundContentUrl,
        },
      ],
    });

    const resultTitleUrl1 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        titleUrl: '      ',
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultTitleUrl1.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'titleUrl',
          errorKey: EXCEPTION_KEYS_ENUM.titleUrl,
        },
      ],
    });

    const resultTitleUrl2 = await request(getApp().getHttpServer())
      .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
      .send({
        ...TEST_MODERATION_APPLY_TASK,
        titleUrl: 'title',
      })
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(400);

    expect(resultTitleUrl2.body).toEqual({
      message: expect.any(String),
      statusCode: 400,
      errorField: [
        {
          message: expect.any(String),
          field: 'titleUrl',
          errorKey: EXCEPTION_KEYS_ENUM.titleUrl,
        },
      ],
    });
  });
}
