class MoviesService {
	constructor(movies, raw) {
		this.movies = movies;
		this.raw = raw;
	}

	async getAllMovies() {
		return this.movies
			.query()
			.select(['movies.*', 'formats.format as format'])
			.join('formats', 'movies.formatId', 'formats.id')
			.withGraphJoined('genres');
	}
}
module.exports = MoviesService;
