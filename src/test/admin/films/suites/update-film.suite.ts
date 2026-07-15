import * as request from 'supertest';
import { MovieHandleStatus } from '@/movies/domain/types';
import {
  TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA,
  TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA,
} from '../../../data/admin-cinema.test.data';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { AdminCinemaFilmsSuiteContext } from '../admin-cinema-films-suite-context';

export function registerAdminCinemaFilmsUpdateSuite({
  getApp,
  getLoginByMainAdmin,
  createMovieFactory,
  getAdminCinemaFilmsUrl,
}: AdminCinemaFilmsSuiteContext): void {
  describe('Admin cinema - films => Update film', () => {
    it('Admin should update film', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await createMovieFactory().createProductionMovie(1, 'Film');

      const result = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query(TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });

      const filmResult1 = result.body.items[0];
      expect(result.body.items).toHaveLength(1);
      expect(filmResult1.isHidden).toBeFalsy();
      expect(filmResult1.status).toBe(MovieHandleStatus.PRODUCTION);

      await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send(TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result2 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query(TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result2.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });

      const filmResult2 = result2.body.items[0];
      expect(result2.body.items).toHaveLength(1);
      expect(filmResult2.isHidden).toBeFalsy();
      expect(filmResult2.status).toBe(MovieHandleStatus.PRODUCTION);

      expect(filmResult1.name).not.toBe(filmResult2.name);
      expect(filmResult1.description).not.toBe(filmResult2.description);
      expect(filmResult1.releaseDate).not.toBe(filmResult2.releaseDate);
      expect(filmResult1.duration).not.toBe(filmResult2.duration);
      expect(filmResult1.originalTitle).not.toBe(filmResult2.originalTitle);
      expect(filmResult1.alternativeTitles).not.toBe(filmResult2.alternativeTitles);
      expect(filmResult1.country).not.toEqual(filmResult2.country);
      expect(filmResult1.content).not.toEqual(filmResult2.content);
    });

    it('Admin should not update, unauthorized', async () => {
      const result = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send(TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA)
        .set({ authorization: `Bearer accessToken` })
        .expect(401);

      expect(result.body).toEqual({
        message: expect.any(String),
        statusCode: 401,
        errorField: [
          {
            message: expect.any(String),
            field: 'token',
            errorKey: EXCEPTION_KEYS_ENUM.UNAUTHORIZED,
          },
        ],
      });
    });

    it('Admin should not update film, film not found', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await createMovieFactory().createProductionMovie(1, 'Film');

      const result = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query(TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result.body.items).toHaveLength(1);
      expect(result.body.items[0].isHidden).toBeFalsy();
      expect(result.body.items[0].status).toBe(MovieHandleStatus.PRODUCTION);

      await request(getApp().getHttpServer())
        .delete(`${getAdminCinemaFilmsUrl()}/1`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const notFoundResult = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send(TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(404);

      expect(notFoundResult.body).toEqual({
        message: expect.any(String),
        statusCode: 404,
        errorField: [
          {
            message: expect.any(String),
            field: 'filmId',
            errorKey: EXCEPTION_KEYS_ENUM.FILM_NOT_FOUND,
          },
        ],
      });
    });

    it('Admin should not update, bad input data', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await createMovieFactory().createProductionMovie(1, 'Film');

      const result = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query(TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result.body.items).toHaveLength(1);
      expect(result.body.items[0].isHidden).toBeFalsy();
      expect(result.body.items[0].status).toBe(MovieHandleStatus.PRODUCTION);

      const badResult1 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, name: '    ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult1.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'name',
            errorKey: EXCEPTION_KEYS_ENUM.name,
          },
        ],
      });

      const badResult2 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({
          ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA,
          name: 'rfjkrfnjkfrnjkfrnjknrfjknrfjkjkrfnjkfrnjkfrjknrfjknjkrfnjkrfnjkrfnjkrfnjkrfnjknrfjknrfjknrfjknjkfrnrfjkrfnjkrfnjkrnfkjjknfr',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult2.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'name',
            errorKey: EXCEPTION_KEYS_ENUM.name,
          },
        ],
      });

      const badResult3 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, kpId: '       ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult3.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'kpId',
            errorKey: EXCEPTION_KEYS_ENUM.kpId,
          },
        ],
      });

      const badResult4 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({
          ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA,
          kpId: 'rfjknfjkrnjkfrnjkfrnjkfrnjkrfnjknfrjknjkrfnjkrfjkfrnjkrfnjkrfnjkfrnjkrfnjfjrknjkfrnjfrnjfrjnrfjknrfjk',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult4.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'kpId',
            errorKey: EXCEPTION_KEYS_ENUM.kpId,
          },
        ],
      });

      const badResult5 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, description: '       ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult5.body).toEqual({
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

      const badResult6 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({
          ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA,
          description:
            'rfkrfjkfrnjkfrnkjnjrfjkrfnjkfrnjkfjrknjkfrnjkfrnjkfrnjknfjrjkfrnjrfnjrfjkjfkrnjkfrnjkfrnjknfrjknfrjknjkfrnjkfrnjkfrjknfjrknjkfrnjkfrnjfrnjknrfjknjfkrnjfrnjfrnjkrfnjknfrjknjkrfnjkfrnjkrfnjkrfnjknrfjknjfkrnjkrfnjkfrnjkrfnjknjkrfnjfrnjkfrjknfrjknjfkrnjkfrnjkfrnjknfrjk',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult6.body).toEqual({
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

      const badResult7 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/filmId`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, releaseDate: '       ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult7.body).toEqual({
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

      const badResult8 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, releaseDate: '01012020' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult8.body).toEqual({
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

      const badResult9 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, originalName: '   ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult9.body).toEqual({
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

      const badResult10 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({
          ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA,
          originalName:
            'nrjnfrjrbfbjhfrhjrfhjbrfhjbhjrfbhjfrbhjdbrfhbrfdjhfrbhrfjbhrfhjfrdbfrhjrfdhbhjdrfbhrfdbrfdhjbrfhjdbhjrfdhjfrdbhjrfdbhjbfrhjbhjfrdbhjrdfbhjfrdbhjfrbhjbfhrjbjhrfdbhjbrfdhjbhfjrdbhfrdjbrfdjhrfdbhjrfd',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult10.body).toEqual({
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

      const badResult11 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, alternativeName: '   ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult11.body).toEqual({
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

      const badResult12 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({
          ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA,
          alternativeName:
            'nrjnfrjrbfbjhfrhjrfhjbrfhjbhjrfbhjfrbhjdbrfhbrfdjhfrbhrfjbhrfhjfrdbfrhjrfdhbhjdrfbhrfdbrfdhjbrfhjdbhjrfdhjfrdbhjrfdbhjbfrhjbhjfrdbhjrdfbhjfrdbhjfrbhjbfhrjbjhrfdbhjbrfdhjbhfjrdbhfrdjbrfdjhrfdbhjrfdnrjnfrjrbfbjhfrhjrfhjbrfhjbhjrfbhjfrbhjdbrfhbrfdjhfrbhrfjbhrfhjfrdbfrhjrfdhbhjdrfbhrfdbrfdhjbrfhjdbhjrfdhjfrdbhjrfdbhjbfrhjbhjfrdbhjrdfbhjfrdbhjfrbhjbfhrjbjhrfdbhjbrfdhjbhfjrdbhfrdjbrfdjhrfdbhjrfdnrjnfrjrbfbjhfrhjrfhjbrfhjbhjrfbhjfrbhjdbrfhbrfdjhfrbhrfjbhrfhjfrdbfrhjrfdhbhjdrfbhrfdbrfdhjbrfhjdbhjrfdhjfrdbhjrfdbhjbfrhjbhjfrdbhjrdfbhjfrdbhjfrbhjbfhrjbjhrfdbhjbrfdhjbhfjrdbhfrdjbrfdjhrfdbhjrfdnrjnfrjrbfbjhfrhjrfhjbrfhjbhjrfbhjfrbhjdbrfhbrfdjhfrbhrfjbhrfhjfrdbfrhjrfdhbhjdrfbhrfdbrfdhjbrfhjdbhjrfdhjfrdbhjrfdbhjbfrhjbhjfrdbhjrdfbhjfrdbhjfrbhjbfhrjbjhrfdbhjbrfdhjbhfjrdbhfrdjbrfdjhrfdbhjrfdnrjnfrjrbfbjhfrhjrfhjbrfhjbhjrfbhjfrbhjdbrfhbrfdjhfrbhrfjbhrfhjfrdbfrhjrfdhbhjdrfbhrfdbrfdhjbrfhjdbhjrfdhjfrdbhjrfdbhjbfrhjbhjfrdbhjrdfbhjfrdbhjfrbhjbfhrjbjhrfdbhjbrfdhjbhfjrdbhfrdjbrfdjhrfdbhjrfd',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult12.body).toEqual({
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

      const badResult13 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, duration: 'duration' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult13.body).toEqual({
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

      const badResult14 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, duration: ['duration'] })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult14.body).toEqual({
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

      const badResult15 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, videUrl: '    ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult15.body).toEqual({
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

      const badResult16 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, videUrl: 'url' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult16.body).toEqual({
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

      const badResult17 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, trailerUrl: 'url' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult17.body).toEqual({
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

      const badResult19 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, trailerUrl: '    ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult19.body).toEqual({
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

      const badResult20 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, backgroundContentUrl: '    ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult20.body).toEqual({
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

      const badResult21 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, backgroundContentUrl: 'url' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult21.body).toEqual({
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

      const badResult22 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, previewUrl: 'url' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult22.body).toEqual({
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

      const badResult23 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, previewUrl: '   ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult23.body).toEqual({
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

      const badResult24 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, titleUrl: '   ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult24.body).toEqual({
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

      const badResult25 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, titleUrl: 'url' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult25.body).toEqual({
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

      const badResult26 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/filmId`)
        .send(TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult26.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'filmId',
            errorKey: EXCEPTION_KEYS_ENUM.filmId,
          },
        ],
      });

      const badResult27 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, country: [{ country: 'Name' }] })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult27.body).toEqual({
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

      const badResult28 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, country: ['     ', '      '] })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult28.body).toEqual({
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

      const badResult29 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, genres: ['     '] })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult29.body).toEqual({
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

      const badResult30 = await request(getApp().getHttpServer())
        .put(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ ...TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA, genres: [{ genre: 'Name' }] })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult30.body).toEqual({
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

      const result2 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query(TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result2.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result2.body.items).toHaveLength(1);
      expect(result2.body.items[0].isHidden).toBeFalsy();
      expect(result2.body.items[0].status).toBe(MovieHandleStatus.PRODUCTION);
    });
  });
}
