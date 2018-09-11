// Update with your config settings.

module.exports = {
  test: {
    client: 'mysql',
    connection: {
      database: 'orthrus-event-store-test',
      user: 'orthrus',
      password: 'orthrus',
    },
    seeds: {
      directory: '../tests/int/seeds',
    },
  },

  development: {
    client: 'mysql',
    connection: {
      database: process.env.ORTHRUS_EVENT_STORE_DB,
      user: process.env.ORTHRUS_EVENT_STORE_DB_USER,
      password: process.env.ORTHRUS_EVENT_STORE_DB_PASS,
    },
  },

  staging: {
    client: 'mysql',
    connection: {
      database: 'my_db',
      user: 'username',
      password: 'password',
    },
  },

  production: {
    client: 'mysql',
    connection: {
      database: 'my_db',
      user: 'username',
      password: 'password',
    },
  },
}
