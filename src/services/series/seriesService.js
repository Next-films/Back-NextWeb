class SeriesService {
	constructor(series, raw) {
		this.series = series;
		this.raw = raw;
	}

	async getAllSeries() {
		return this.series
			.query()
			.select(['series.*', 'formats.format as format'])
			.join('formats', 'series.formatId', 'formats.id')
			.withGraphJoined('genres')
			.withGraphJoined('episodes');
	}
	async getSeriesById(id) {
		return this.series
			.query()
			.findById(id)
			.select(['series.*', 'formats.format as format'])
			.join('formats', 'series.formatId', 'formats.id')
			.withGraphJoined('genres')
			.withGraphJoined('episodes');
	}
}
module.exports = SeriesService;
