const seriesSchema = {
	$id: 'Series',
	type: 'object',
	properties: {
		id: {
			type: 'integer',
			minimum: 1,
		},
		title: {
			type: 'string',
		},
		titleImgUrl: {
			type: 'string',
			format: 'uri',
		},
		name: {
			type: 'string',
		},
		subtitle: {
			type: 'string',
		},
		description: {
			type: 'string',
		},
		date: {
			type: 'string',
			format: 'date',
		},
		backgroundImgUrl: {
			type: 'string',
			format: 'uri',
		},
		cardImgUrl: {
			type: 'string',
			format: 'uri',
		},
		trailerUrl: {
			type: 'string',
			format: 'uri',
		},
		formatId: {
			type: 'integer',
			minimum: 1,
		},
		created_at: {
			type: 'string',
			format: 'date-time',
		},
		updated_at: {
			type: 'string',
			format: 'date-time',
		},
		format: {
			type: 'string',
		},
		genres: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: {
						type: 'integer',
						minimum: 1,
					},
					genre: {
						type: 'string',
					},
				},
				required: ['id', 'genre'],
			},
		},
	},
};
const seriesWithEpisodesSchema = {
	$id: 'SeriesWithEpisodes',
	type: 'object',
	properties: {
		id: {
			type: 'integer',
			minimum: 1,
		},
		title: {
			type: 'string',
		},
		titleImgUrl: {
			type: 'string',
			format: 'uri',
		},
		name: {
			type: 'string',
		},
		subtitle: {
			type: 'string',
		},
		description: {
			type: 'string',
		},
		date: {
			type: 'string',
			format: 'date',
		},
		backgroundImgUrl: {
			type: 'string',
			format: 'uri',
		},
		cardImgUrl: {
			type: 'string',
			format: 'uri',
		},
		trailerUrl: {
			type: 'string',
			format: 'uri',
		},
		formatId: {
			type: 'integer',
			minimum: 1,
		},
		created_at: {
			type: 'string',
			format: 'date-time',
		},
		updated_at: {
			type: 'string',
			format: 'date-time',
		},
		format: {
			type: 'string',
		},
		genres: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: {
						type: 'integer',
						minimum: 1,
					},
					genre: {
						type: 'string',
					},
				},
				required: ['id', 'genre'],
			},
		},
		episodes: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: {
						type: 'integer',
						minimum: 1,
					},
					seasonId: {
						type: ['integer', 'null'],
					},
					seriesId: {
						type: 'integer',
						minimum: 1,
					},
					episodeNumber: {
						type: 'integer',
						minimum: 0,
					},
					title: {
						type: ['string', 'null'],
					},
					trailerUrl: {
						type: ['string', 'null'],
						format: 'uri',
					},
					previewUrl: {
						type: 'string',
						format: 'uri',
					},
					episodeUrl: {
						type: 'string',
						format: 'uri',
					},
					releaseDate: {
						type: ['string', 'null'],
						format: 'date',
					},
					created_at: {
						type: 'string',
						format: 'date-time',
					},
					updated_at: {
						type: 'string',
						format: 'date-time',
					},
				},
				required: [
					'id',
					'seriesId',
					'episodeNumber',
					'previewUrl',
					'episodeUrl',
					'created_at',
					'updated_at',
				],
			},
		},
	},
};

module.exports = [seriesSchema, seriesWithEpisodesSchema];
