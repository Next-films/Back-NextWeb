var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// knexfile.js
var require_knexfile = __commonJS({
  "knexfile.js"(exports2, module2) {
    var { resolve } = require("path");
    module2.exports = {
      development: {
        client: "sqlite3",
        connection: {
          filename: resolve(__dirname, "db/nextfilms.db"),
          timezone: "UTC"
        },
        useNullAsDefault: true,
        migrations: {
          directory: resolve(__dirname, "db/migrations")
        },
        seeds: {
          directory: resolve(__dirname, "db/seeds")
        }
      }
    };
  }
});

// src/db.js
var require_db = __commonJS({
  "src/db.js"(exports2, module2) {
    var knex = require("knex");
    var config = require_knexfile();
    var environment = "development";
    var connection = knex(config[environment]);
    module2.exports = connection;
  }
});

// src/models/index.js
var require_models = __commonJS({
  "src/models/index.js"(exports2, module2) {
    var { Model } = require("objection");
    var knex = require_db();
    Model.knex(knex);
    module2.exports = Model;
  }
});

// src/models/Role.js
var require_Role = __commonJS({
  "src/models/Role.js"(exports2, module2) {
    var Model = require_models();
    var User = require_User();
    var UserRole = require_UserRole();
    var knex = require_db();
    var Role = class extends Model {
      static get tableName() {
        return "roles";
      }
      static get idColumn() {
        return "id";
      }
      static get relationMappings() {
        return {
          users: {
            relation: Model.ManyToManyRelation,
            modelClass: User,
            join: {
              from: "roles.id",
              through: {
                from: "userRoles.roleId",
                to: "userRoles.userId"
              },
              to: "users.id"
            }
          },
          userRoles: {
            relation: Model.HasManyRelation,
            modelClass: UserRole,
            join: {
              from: "roles.id",
              to: "userRoles.userId"
            }
          }
        };
      }
    };
    Role.knex(knex);
    module2.exports = Role;
  }
});

// src/models/UserRole.js
var require_UserRole = __commonJS({
  "src/models/UserRole.js"(exports2, module2) {
    var Model = require_models();
    var User = require_User();
    var Role = require_Role();
    var UserRole = class extends Model {
      static get tableName() {
        return "userRoles";
      }
      static get idColumn() {
        return "id";
      }
      static get relationMappings() {
        return {
          user: {
            relation: Model.BelongsToOneRelation,
            modelClass: User,
            join: {
              from: "userRoles.id",
              to: "user.id"
            }
          },
          role: {
            relation: Model.BelongsToOneRelation,
            modelClass: Role,
            join: {
              from: "userRoles.id",
              to: "role.id"
            }
          }
        };
      }
    };
    module2.exports = UserRole;
  }
});

// src/models/User.js
var require_User = __commonJS({
  "src/models/User.js"(exports2, module2) {
    var Model = require_models();
    var UserRole = require_UserRole();
    var Role = require_Role();
    var User = class extends Model {
      static get tableName() {
        return "users";
      }
      static get idColumn() {
        return "id";
      }
      static get relationMappings() {
        return {
          roles: {
            relation: Model.ManyToManyRelation,
            modelClass: Role,
            join: {
              from: "users.id",
              through: {
                from: "userRoles.userId",
                to: "userRoles.roleId"
              },
              to: "roles.id"
            }
          },
          userRoles: {
            relation: Model.HasManyRelation,
            modelClass: UserRole,
            join: {
              from: "users.id",
              to: "userRoles.userId"
            }
          }
        };
      }
    };
    module2.exports = User;
  }
});

// src/services/roleService.js
var require_roleService = __commonJS({
  "src/services/roleService.js"(exports2, module2) {
    var RoleService = class {
      constructor(RoleModel) {
        this.RoleModel = RoleModel;
      }
      async getAllRoles() {
        return this.RoleModel.query();
      }
      async getRoleById(id) {
        return this.RoleModel.query().findById(id);
      }
      async createRole(roleData) {
        return this.RoleModel.query().insert(roleData);
      }
      async getRoleWithUsers(id) {
        return this.RoleModel.query().findById(id).withGraphFetched("users");
      }
    };
    module2.exports = RoleService;
  }
});

// src/services/userService.js
var require_userService = __commonJS({
  "src/services/userService.js"(exports2, module2) {
    var UserService = class {
      constructor(UserModel) {
        this.UserModel = UserModel;
      }
      async getAllUsers() {
        return this.UserModel.query();
      }
      async getUserById(id) {
        return this.UserModel.query().findById(id);
      }
      async createUser(userData) {
        return this.UserModel.query().insert(userData);
      }
      async getUserWithRoles(id) {
        return this.UserModel.query().findById(id).withGraphFetched("roles");
      }
    };
    module2.exports = UserService;
  }
});

// src/services/movies/moviesService.js
var require_moviesService = __commonJS({
  "src/services/movies/moviesService.js"(exports2, module2) {
    var MoviesService = class {
      constructor(movies, raw) {
        this.movies = movies;
        this.raw = raw;
      }
      async getAllMovies() {
        return this.movies.query().select(["movies.*", "formats.format as format"]).join("formats", "movies.formatId", "formats.id").withGraphJoined("genres");
      }
    };
    module2.exports = MoviesService;
  }
});

// src/services/series/seriesService.js
var require_seriesService = __commonJS({
  "src/services/series/seriesService.js"(exports2, module2) {
    var SeriesService = class {
      constructor(series, raw) {
        this.series = series;
        this.raw = raw;
      }
      async getAllSeries() {
        return this.series.query().select(["series.*", "formats.format as format"]).join("formats", "series.formatId", "formats.id").withGraphJoined("genres").withGraphJoined("episodes");
      }
    };
    module2.exports = SeriesService;
  }
});

// src/models/MovieGenre.js
var require_MovieGenre = __commonJS({
  "src/models/MovieGenre.js"(exports2, module2) {
    var Model = require_models();
    var Movie = require_Movie();
    var Genre = require_Genre();
    var MovieGenre = class extends Model {
      static get tableName() {
        return "movieGenres";
      }
      static get idColumn() {
        return "id";
      }
      static get relationMappings() {
        return {
          movies: {
            relation: Model.BelongsToOneRelation,
            modelClass: Movie,
            join: {
              from: "movieGenres.movieId",
              to: "movies.id"
            }
          },
          genres: {
            relation: Model.BelongsToOneRelation,
            modelClass: Genre,
            join: {
              from: "movieGenres.genreId",
              to: "genres.id"
            }
          }
        };
      }
    };
    module2.exports = MovieGenre;
  }
});

// src/models/Format.js
var require_Format = __commonJS({
  "src/models/Format.js"(exports2, module2) {
    var Model = require_models();
    var Format = class extends Model {
      static get tableName() {
        return "formats";
      }
      static get idColumn() {
        return "id";
      }
      // static get relationMappings() {
      // 	return {
      // 		movies: {
      // 			relation: Model.ManyToManyRelation,
      // 			modelClass: Movie,
      // 			join: {
      // 				from: 'formats.id',
      // 				through: {
      // 					from: 'movieFormats.formatId',
      // 					to: 'movieFormats.movieId',
      // 				},
      // 				to: 'movies.id',
      // 			},
      // 		},
      // 		series: {
      // 			relation: Model.ManyToManyRelation,
      // 			modelClass: Series,
      // 			join: {
      // 				from: 'formats.id',
      // 				through: {
      // 					from: 'seriesFormats.formatId',
      // 					to: 'seriesFormats.seriesId',
      // 				},
      // 				to: 'series.id',
      // 			},
      // 		},
      // 		seriesFormats: {
      // 			relation: Model.HasManyRelation,
      // 			modelClass: SeriesFormat,
      // 			join: {
      // 				from: 'formats.id',
      // 				to: 'seriesFormats.formatId',
      // 			},
      // 		},
      // 	};
      // }
    };
    module2.exports = Format;
  }
});

// src/models/Episode.js
var require_Episode = __commonJS({
  "src/models/Episode.js"(exports2, module2) {
    var Model = require_models();
    var Series = require_Series();
    var Episode = class extends Model {
      static get tableName() {
        return "episodes";
      }
      static get idColumn() {
        return "id";
      }
      static get relationMappings() {
        return {
          series: {
            relation: Model.BelongsToOneRelation,
            modelClass: Series,
            join: {
              from: "episodes.seriesId",
              to: "series.id"
            }
          }
        };
      }
    };
    module2.exports = Episode;
  }
});

// src/models/Series.js
var require_Series = __commonJS({
  "src/models/Series.js"(exports2, module2) {
    var Model = require_models();
    var Format = require_Format();
    var SeriesGenre = require_SeriesGenre();
    var Episode = require_Episode();
    var Series = class extends Model {
      static get tableName() {
        return "series";
      }
      static get idColumn() {
        return "id";
      }
      static get relationMappings() {
        return {
          genres: {
            relation: Model.ManyToManyRelation,
            modelClass: require_Genre(),
            join: {
              from: "series.id",
              through: {
                from: "seriesGenres.seriesId",
                to: "seriesGenres.genreId"
              },
              to: "genres.id"
            }
          },
          seriesGenres: {
            relation: Model.HasManyRelation,
            modelClass: SeriesGenre,
            join: {
              from: "series.id",
              to: "seriesGenres.seriesId"
            }
          },
          formats: {
            relation: Model.BelongsToOneRelation,
            modelClass: Format,
            join: {
              from: "series.formatId",
              to: "formats.id"
            }
          },
          // seriesFormats: {
          // 	relation: Model.HasManyRelation,
          // 	modelClass: SeriesFormat,
          // 	join: {
          // 		from: 'series.id',
          // 		to: 'seriesFormats.seriesId',
          // 	},
          // },
          episodes: {
            relation: Model.HasManyRelation,
            modelClass: Episode,
            join: {
              from: "series.id",
              to: "episodes.seriesId"
            }
          }
        };
      }
    };
    module2.exports = Series;
  }
});

// src/models/SeriesGenre.js
var require_SeriesGenre = __commonJS({
  "src/models/SeriesGenre.js"(exports2, module2) {
    var Model = require_models();
    var Genre = require_Genre();
    var Series = require_Series();
    var SeriesGenre = class extends Model {
      static get tableName() {
        return "seriesGenres";
      }
      static get idColumn() {
        return "id";
      }
      static get relationMappings() {
        return {
          series: {
            relation: Model.BelongsToOneRelation,
            modelClass: Series,
            join: {
              from: "seriesGenres.seriesId",
              to: "series.id"
            }
          },
          genres: {
            relation: Model.BelongsToOneRelation,
            modelClass: Genre,
            join: {
              from: "seriesGenres.genreId",
              to: "genres.id"
            }
          }
        };
      }
    };
    module2.exports = SeriesGenre;
  }
});

// src/models/Genre.js
var require_Genre = __commonJS({
  "src/models/Genre.js"(exports2, module2) {
    var Model = require_models();
    var Movie = require_Movie();
    var MovieGenre = require_MovieGenre();
    var SeriesGenre = require_SeriesGenre();
    var Genre = class extends Model {
      static get tableName() {
        return "genres";
      }
      static get idColumn() {
        return "id";
      }
      static get relationMappings() {
        return {
          movies: {
            relation: Model.ManyToManyRelation,
            modelClass: Movie,
            join: {
              from: "genres.id",
              through: {
                from: "movieGenres.genreId",
                to: "movieGenres.movieId"
              },
              to: "movies.id"
            }
          },
          series: {
            relation: Model.ManyToManyRelation,
            modelClass: require_Series(),
            join: {
              from: "genres.id",
              through: {
                from: "seriesGenres.genreId",
                to: "seriesGenres.seriesId"
              },
              to: "series.id"
            }
          },
          movieGenres: {
            relation: Model.HasManyRelation,
            modelClass: MovieGenre,
            join: {
              from: "genres.id",
              to: "movieGenres.genreId"
            }
          },
          seriesGenres: {
            relation: Model.HasManyRelation,
            modelClass: SeriesGenre,
            join: {
              from: "genres.id",
              to: "seriesGenres.genreId"
            }
          }
        };
      }
    };
    module2.exports = Genre;
  }
});

// src/models/Movie.js
var require_Movie = __commonJS({
  "src/models/Movie.js"(exports2, module2) {
    var Model = require_models();
    var Genre = require_Genre();
    var Format = require_Format();
    var MovieGenre = require_MovieGenre();
    var Movie = class extends Model {
      static get tableName() {
        return "movies";
      }
      static get idColumn() {
        return "id";
      }
      static get relationMappings() {
        return {
          genres: {
            relation: Model.ManyToManyRelation,
            modelClass: Genre,
            join: {
              from: "movies.id",
              through: {
                from: "movieGenres.movieId",
                to: "movieGenres.genreId"
              },
              to: "genres.id"
            }
          },
          movieGenres: {
            relation: Model.HasManyRelation,
            modelClass: MovieGenre,
            join: {
              from: "movies.id",
              to: "movieGenres.movieId"
            }
          },
          formats: {
            relation: Model.BelongsToOneRelation,
            modelClass: Format,
            join: {
              from: "movies.formatId",
              to: "formats.id"
            }
          }
        };
      }
    };
    module2.exports = Movie;
  }
});

// src/plugins/database.js
var require_database = __commonJS({
  "src/plugins/database.js"(exports2, module2) {
    var fp = require("fastify-plugin");
    var knex = require_db();
    var User = require_User();
    var Role = require_Role();
    var RoleService = require_roleService();
    var UserService = require_userService();
    var MoviesService = require_moviesService();
    var SeriesService = require_seriesService();
    var Movie = require_Movie();
    var Series = require_Series();
    var { raw } = require("objection");
    async function dbPlugin2(fastify2, options) {
      fastify2.decorate("knex", knex);
      fastify2.decorate("userService", new UserService(User));
      fastify2.decorate("roleService", new RoleService(Role));
      fastify2.decorate("movieService", new MoviesService(Movie, raw));
      fastify2.decorate("seriesService", new SeriesService(Series, raw));
      fastify2.addHook("onClose", async (instance) => {
        await instance.knex.destroy();
      });
    }
    module2.exports = fp(dbPlugin2);
  }
});

// src/services/passwordService.js
var require_passwordService = __commonJS({
  "src/services/passwordService.js"(exports2, module2) {
    var crypto = require("crypto");
    var PasswordService = class {
      /**
       * @returns {string}
       */
      generateSalt() {
        return crypto.randomBytes(16).toString("hex");
      }
      /**
       * @param {string} password
       * @param {string} salt
       * @returns {Promise<string>}
       */
      hashPassword(password, salt) {
        return new Promise((resolve, reject) => {
          crypto.pbkdf2(password, salt, 1e5, 64, "sha512", (err, derivedKey) => {
            if (err) {
              reject(err);
            } else {
              resolve(derivedKey.toString("hex"));
            }
          });
        });
      }
      /**
       * @param {string} password
       * @param {string} hashedPassword
       * @param {string} salt
       * @returns {Promise<boolean>}
       */
      async verifyPassword(password, hashedPassword, salt) {
        const newHash = await this.hashPassword(password, salt);
        return newHash === hashedPassword;
      }
    };
    module2.exports = new PasswordService();
  }
});

// src/plugins/password.js
var require_password = __commonJS({
  "src/plugins/password.js"(exports2, module2) {
    var PasswordService = require_passwordService();
    async function passwordServicePlugin2(fastify2, options) {
      fastify2.decorate("passwordService", PasswordService);
    }
    module2.exports = passwordServicePlugin2;
  }
});

// src/schemas/movie-schema.js
var require_movie_schema = __commonJS({
  "src/schemas/movie-schema.js"(exports2, module2) {
    var movieSchema = {
      type: "object",
      properties: {
        id: { type: "integer" },
        title: { type: "string" },
        subtitle: { type: "string" },
        name: { type: "string" },
        date: { type: "string", format: "date" },
        description: { type: "string" },
        titleImgUrl: { type: "string", format: "uri" },
        backgroundImgUrl: { type: "string", format: "uri" },
        cardImgUrl: { type: "string", format: "uri" },
        movieUrl: { type: "string", format: "uri" },
        trailerUrl: { type: "string", format: "uri" },
        ads: { type: "null" },
        formatId: { type: "integer" },
        created_at: { type: "string", format: "date-time" },
        updated_at: { type: "string", format: "date-time" },
        format: { type: "string" },
        genres: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "integer" },
              genre: { type: "string" }
            },
            required: ["id", "genre"]
          }
        }
      }
      // required: [
      // 	'id',
      // 	'title',
      // 	'subtitle',
      // 	'name',
      // 	'date',
      // 	'description',
      // 	'titleImgUrl',
      // 	'backgroundImgUrl',
      // 	'cardImgUrl',
      // 	'movieUrl',
      // 	'trailerUrl',
      // 	'formatId',
      // 	'created_at',
      // 	'updated_at',
      // 	'format',
      // 	'genres',
      // ],
    };
    module2.exports = { movieSchema };
  }
});

// src/schemas/series-schema.js
var require_series_schema = __commonJS({
  "src/schemas/series-schema.js"(exports2, module2) {
    var seriesSchema = {
      type: "object",
      properties: {
        id: {
          type: "integer",
          minimum: 1
        },
        title: {
          type: "string"
        },
        titleImgUrl: {
          type: "string",
          format: "uri"
        },
        name: {
          type: "string"
        },
        subtitle: {
          type: "string"
        },
        description: {
          type: "string"
        },
        date: {
          type: "string",
          format: "date"
        },
        backgroundImgUrl: {
          type: "string",
          format: "uri"
        },
        cardImgUrl: {
          type: "string",
          format: "uri"
        },
        trailerUrl: {
          type: "string",
          format: "uri"
        },
        formatId: {
          type: "integer",
          minimum: 1
        },
        created_at: {
          type: "string",
          format: "date-time"
        },
        updated_at: {
          type: "string",
          format: "date-time"
        },
        format: {
          type: "string"
        },
        genres: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {
                type: "integer",
                minimum: 1
              },
              genre: {
                type: "string"
              }
            },
            required: ["id", "genre"]
          }
        }
      }
      // required: [
      // 	'id',
      // 	'title',
      // 	'titleImgUrl',
      // 	'name',
      // 	'subtitle',
      // 	'description',
      // 	'date',
      // 	'backgroundImgUrl',
      // 	'cardImgUrl',
      // 	'trailerUrl',
      // 	'formatId',
      // 	'created_at',
      // 	'updated_at',
      // 	'format',
      // 	'genres',
      // ],
    };
    var seriesWithEpisodesSchema = {
      type: "object",
      properties: {
        id: {
          type: "integer",
          minimum: 1
        },
        title: {
          type: "string"
        },
        titleImgUrl: {
          type: "string",
          format: "uri"
        },
        name: {
          type: "string"
        },
        subtitle: {
          type: "string"
        },
        description: {
          type: "string"
        },
        date: {
          type: "string",
          format: "date"
        },
        backgroundImgUrl: {
          type: "string",
          format: "uri"
        },
        cardImgUrl: {
          type: "string",
          format: "uri"
        },
        trailerUrl: {
          type: "string",
          format: "uri"
        },
        formatId: {
          type: "integer",
          minimum: 1
        },
        created_at: {
          type: "string",
          format: "date-time"
        },
        updated_at: {
          type: "string",
          format: "date-time"
        },
        format: {
          type: "string"
        },
        genres: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {
                type: "integer",
                minimum: 1
              },
              genre: {
                type: "string"
              }
            },
            required: ["id", "genre"]
          }
        },
        episodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {
                type: "integer",
                minimum: 1
              },
              seasonId: {
                type: ["integer", "null"]
              },
              seriesId: {
                type: "integer",
                minimum: 1
              },
              episodeNumber: {
                type: "integer",
                minimum: 0
              },
              title: {
                type: ["string", "null"]
              },
              trailerUrl: {
                type: ["string", "null"],
                format: "uri"
              },
              previewUrl: {
                type: "string",
                format: "uri"
              },
              episodeUrl: {
                type: "string",
                format: "uri"
              },
              releaseDate: {
                type: ["string", "null"],
                format: "date"
              },
              created_at: {
                type: "string",
                format: "date-time"
              },
              updated_at: {
                type: "string",
                format: "date-time"
              }
            },
            required: [
              "id",
              "seriesId",
              "episodeNumber",
              "previewUrl",
              "episodeUrl",
              "created_at",
              "updated_at"
            ]
          }
        }
      }
      // required: [
      // 	'id',
      // 	'title',
      // 	'titleImgUrl',
      // 	'name',
      // 	'subtitle',
      // 	'description',
      // 	'date',
      // 	'backgroundImgUrl',
      // 	'cardImgUrl',
      // 	'trailerUrl',
      // 	'formatId',
      // 	'created_at',
      // 	'updated_at',
      // 	'format',
      // 	'genres',
      // 	'episodes',
      // ],
    };
    module2.exports = { seriesSchema, seriesWithEpisodesSchema };
  }
});

// src/plugins/swagger.js
var require_swagger = __commonJS({
  "src/plugins/swagger.js"(exports2, module2) {
    var { fastifySwagger } = require("@fastify/swagger");
    var { fastifySwaggerUi } = require("@fastify/swagger-ui");
    var fastifyPlugin = require("fastify-plugin");
    var { movieSchema } = require_movie_schema();
    var {
      seriesSchema,
      seriesWithEpisodesSchema
    } = require_series_schema();
    async function swaggerKit(fastify2, { port: port2 }) {
      fastify2.addSchema({
        $id: "Movie",
        ...movieSchema
      });
      fastify2.addSchema({
        $id: "Series",
        ...seriesSchema
      });
      fastify2.addSchema({
        $id: "SeriesWithEpisodes",
        ...seriesWithEpisodesSchema
      });
      fastify2.register(fastifySwagger, {
        openapi: {
          openapi: "3.0.0",
          info: {
            title: "NextFilms swagger API",
            description: "NextFilms Fastify swagger API",
            version: "0.1.0"
          },
          servers: [
            {
              url: `http://localhost:${port2}`,
              description: "Development server"
            }
          ],
          components: {
            schemas: {
              Movie: "Movie#",
              Series: "Series#",
              SeriesWithEpisodes: "SeriesWithEpisodes#"
            }
          }
        },
        exposeRoute: true
      });
      fastify2.register(fastifySwaggerUi, {
        routePrefix: "/documentation",
        uiConfig: {
          docExpansion: "full",
          deepLinking: true,
          defaultModelsExpandDepth: 3,
          defaultModelExpandDepth: 3,
          displayOperationId: true
        },
        uiHooks: {
          onRequest: function(request, reply, next) {
            next();
          },
          preHandler: function(request, reply, next) {
            next();
          },
          onSend: (request, reply, payload, done) => {
            reply.header(
              "Content-Security-Policy",
              "style-src 'self' 'unsafe-inline'"
            );
            done();
          }
        },
        staticCSP: false,
        transformStaticCSP: (header) => header,
        transformSpecification: (swaggerObject, request, reply) => {
          return swaggerObject;
        },
        transformSpecificationClone: true
      });
    }
    module2.exports = fastifyPlugin(swaggerKit);
  }
});

// src/index.js
var import_fastify = __toESM(require("fastify"));

// src/routes/api/films.js
function films_default(fastify2, opts) {
  fastify2.get(
    "/",
    {
      schema: {
        response: {
          200: {
            type: "array",
            items: { $ref: "Movie#" }
          }
        }
      }
    },
    async (req, reply) => {
      const movies = await fastify2.movieService.getAllMovies();
      return movies;
    }
  );
}

// src/routes/api/series.js
function series_default(fastify2, opts) {
  fastify2.get(
    "/",
    {
      schema: {
        response: {
          200: {
            type: "array",
            items: { $ref: "SeriesWithEpisodes#" }
          }
        }
      }
    },
    async (req, reply) => {
      const series = await fastify2.seriesService.getAllSeries();
      return series;
    }
  );
}

// src/routes/api/users.js
function users_default(fastify2, opts) {
  fastify2.get("/", async (req, reply) => {
    const users = await fastify2.userService.getAllUsers();
    return users;
  });
}

// src/routes/api/auth/signup.js
function signup_default(fastify2) {
  fastify2.get("/", async (req, reply) => {
    return { hello: "from fastify signup" };
  });
}

// src/routes/api/auth/signin.js
function signin_default(fastify2) {
  fastify2.get("/", async (req, reply) => {
    return { hello: "from fastify signin" };
  });
}

// src/routes/api/auth/signout.js
function signout_default(fastify2) {
  fastify2.get("/", async () => {
    return { hello: "from api/signout" };
  });
}

// src/routes/api/auth/index.js
function auth_default(fastify2) {
  fastify2.get("/", async (req, reply) => {
    return { hello: "world from api/auth" };
  });
  fastify2.register(signup_default, { prefix: "/signup" });
  fastify2.register(signin_default, { prefix: "/signin" });
  fastify2.register(signout_default, { prefix: "/signout" });
}

// src/routes/api/index.js
function api_default(fastify2) {
  fastify2.get(
    "/",
    {
      schema: {
        tags: ["api"],
        description: "API root endpoint",
        response: {
          200: {
            type: "object",
            properties: {
              hello: { type: "string" }
            }
          }
        }
      }
    },
    async (req, reply) => {
      return { hello: "world from api" };
    }
  );
  fastify2.register(auth_default, { prefix: "/auth" });
  fastify2.register(films_default, { prefix: "/films" });
  fastify2.register(series_default, { prefix: "/series" });
  fastify2.register(users_default, { prefix: "/users" });
}

// src/routes/index.js
function routes_default(fastify2, opts) {
  fastify2.get(
    "/",
    {
      schema: {
        tags: ["root"],
        description: "Root endpoint",
        response: {
          200: {
            type: "object",
            properties: {
              hello: { type: "string" }
            }
          }
        }
      }
    },
    async function(request, reply) {
      return { hello: "world from root" };
    }
  );
  fastify2.register(api_default, { prefix: "/api" });
}

// src/index.js
var import_database = __toESM(require_database());
var import_password = __toESM(require_password());
var import_swagger = __toESM(require_swagger());

// src/config/logger.js
var envToLogger = {
  development: {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
        sync: false
      }
    }
  },
  production: true,
  test: false
};

// src/index.js
var { PORT: port, NODE_ENV: mode } = process.env;
var fastify = (0, import_fastify.default)({
  logger: envToLogger[mode],
  https: false
});
fastify.register(import_swagger.default, { port });
fastify.register(import_database.default);
fastify.register(import_password.default);
fastify.register(routes_default);
var start = async () => {
  try {
    await fastify.listen({ port: Number(port), host: "0.0.0.0" });
    fastify.log.info(`\u0421\u0435\u0440\u0432\u0435\u0440 \u0437\u0430\u043F\u0443\u0449\u0435\u043D \u043D\u0430 http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
//# sourceMappingURL=bundle.js.map
