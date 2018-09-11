import knex from 'knex'
import { EventsDb, MysqlConfig, EventToSave, EventRetrieved } from '../types'
import { InvalidQueryError, UniqueConstraintViolation } from '../../errors'

const INVALID_POS = -1

export default class MySqlEventsDb implements EventsDb {
  public db: knex
  public tableName: string
  public query: (
    from: number,
    to: number,
    queryField: string,
    filter?: { key: string; value: string }
  ) => Promise<EventRetrieved[]>

  constructor(config: MysqlConfig) {
    this.db = knex({
      client: 'mysql',
      connection: {
        host: config.host,
        port: config.port || 3306,
        user: config.user,
        password: config.password,
        database: config.database,
      },
      pool: config.pool || {
        min: 1,
        max: 10,
      },
    })

    this.tableName = `${config.streamName}-${config.streamVersion}`
    this.query = getEvents(this.db, this.tableName)
  }

  public async destroy(): Promise<void> {
    await this.db.destroy()
    return Promise.resolve()
  }

  public async getAllEvents(
    fromPos: number = 1,
    toPos: number = INVALID_POS
  ): Promise<EventRetrieved[]> {
    return this.query(fromPos, toPos, 'position')
  }

  public async getEventsByType(
    aggregate: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<EventRetrieved[]> {
    if (limit < 1) {
      return Promise.reject(
        new InvalidQueryError('limit should be greater than 0')
      )
    }

    if (offset < 0) {
      return Promise.reject(
        new InvalidQueryError('offset should be a positive number')
      )
    }
    const results = await this.db(this.tableName)
      .where('aggregate', aggregate)
      .limit(limit)
      .offset(offset)
    return Promise.resolve(results)
  }

  public async getEventsById(
    aggregateId: string,
    fromRev: number = 1,
    toRev: number = INVALID_POS
  ): Promise<EventRetrieved[]> {
    return this.query(fromRev, toRev, 'revision', {
      key: 'aggregateId',
      value: aggregateId,
    })
  }

  public async getLastEvent(
    aggregateId: string
  ): Promise<EventRetrieved | undefined> {
    const result = await this.db(this.tableName)
      .where('aggregateId', aggregateId)
      .orderBy('position', 'desc')
      .limit(1)
    return result.length === 0
      ? Promise.resolve(undefined)
      : Promise.resolve(result[0])
  }

  public async saveEvents(events: EventToSave[]): Promise<void> {
    try {
      await this.db(this.tableName).insert(events)
      return Promise.resolve()
    } catch (e) {
      if (e.message.includes('ER_DUP_ENTRY')) {
        return Promise.reject(uniqueConstraintError(events))
      }
      return Promise.reject(e)
    }
  }
}

const uniqueConstraintError = (events: EventToSave[]) =>
  new UniqueConstraintViolation(
    `Unique constraint on aggregateId-revision failed on one of the events in ${JSON.stringify(
      events
    )}`
  )

const getEvents = (db: knex, table: string) => async (
  from: number,
  to: number,
  queryField: string,
  filter?: {
    key: string
    value: string
  }
): Promise<EventRetrieved[]> => {
  if (from < 1) {
    return Promise.reject(
      new InvalidQueryError('from should be greater than 0')
    )
  }

  if (to !== INVALID_POS && from > to) {
    return Promise.reject(
      new InvalidQueryError('from should not be greater than to')
    )
  }

  let result = []
  let query = db(table)
  if (filter) {
    query = query.where(filter.key, filter.value)
  }

  if (to === INVALID_POS) {
    result = await query.where(queryField, '>=', from)
  } else {
    result = await query.whereBetween(queryField, [from, to])
  }

  return Promise.resolve(result)
}
