const Model = require('./index');
const Movie = require('./Movie');
// const Series = require('./Series');
const MovieGenre = require('./MovieGenre');
const SeriesGenre = require('./SeriesGenre');

class Genre extends Model {
	static get tableName() {
		return 'genres';
	}
	static get idColumn() {
		return 'id';
	}
	static get relationMappings() {
		return {
			movies: {
				relation: Model.ManyToManyRelation,
				modelClass: Movie,
				join: {
					from: 'genres.id',
					through: {
						from: 'movieGenres.genreId',
						to: 'movieGenres.movieId',
					},
					to: 'movies.id',
				},
			},
			series: {
				relation: Model.ManyToManyRelation,
				modelClass: require('./Series'),
				join: {
					from: 'genres.id',
					through: {
						from: 'seriesGenres.genreId',
						to: 'seriesGenres.seriesId',
					},
					to: 'series.id',
				},
			},
			movieGenres: {
				relation: Model.HasManyRelation,
				modelClass: MovieGenre,
				join: {
					from: 'genres.id',
					to: 'movieGenres.genreId',
				},
			},
			seriesGenres: {
				relation: Model.HasManyRelation,
				modelClass: SeriesGenre,
				join: {
					from: 'genres.id',
					to: 'seriesGenres.genreId',
				},
			},
		};
	}
}

module.exports = Genre;
