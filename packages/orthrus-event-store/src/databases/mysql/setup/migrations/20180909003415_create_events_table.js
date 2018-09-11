const tableName = process.env.ORTHRUS_EVENT_STORE_TABLE || 'orthrus-events'

exports.up = function(knex, Promise) {
  return knex.schema.createTable(tableName, function(t) {
    t.increments('position')
      .unsigned()
      .primary()
    t.string('aggregateId').notNull()
    t.string('aggregate')
      .notNull()
      .index()
    t.string('commitId').notNull()
    t.integer('revision')
      .notNull()
      .unsigned()
    t.json('payload').notNull()
    t.timestamp('created_at').defaultTo(knex.fn.now())

    t.unique(['aggregateId', 'revision'])
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTable(tableName)
}
