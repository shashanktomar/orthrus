import knex from 'knex'
import { InvalidQueryError } from '../../../../errors'
import MySqlEventsDb from '../..'
import { MysqlConfig, EventsDb, EventToSave } from '../../../types'

describe('Mysql event-store test', () => {
  const config: MysqlConfig = {
    type: 'mysql',
    host: 'localhost',
    user: 'orthrus',
    password: 'orthrus',
    database: 'orthrus-event-store-test',
    streamName: 'orthrus-events',
    streamVersion: '1-0-0',
  }

  const tableName = `${config.streamName}-${config.streamVersion}`
  let eventsDb: EventsDb = new MySqlEventsDb(config)
  let initialTableName: string | undefined

  beforeAll(() => {
    initialTableName = process.env.ORTHRUS_EVENT_STORE_TABLE
    process.env.ORTHRUS_EVENT_STORE_TABLE = tableName
    eventsDb = new MySqlEventsDb(config)
    return initDatabase()
  })

  afterAll(async () => {
    await eventsDb.destroy()
    return clearDatabase().then(
      () => (process.env.ORTHRUS_EVENT_STORE_TABLE = initialTableName)
    )
  })

  describe('getAllEvents', () => {
    it('should return all events if no args are passed', async () => {
      const res = await eventsDb.getAllEvents()
      expect(res).toHaveLength(10)
    })

    it('should return all events starting at fromPos if no toPos is passed', async () => {
      const res = await eventsDb.getAllEvents(3)
      expect(res).toHaveLength(8)
    })

    it('should return all events starting at fromPos if toPos is -1', async () => {
      const res = await eventsDb.getAllEvents(3, -1)
      expect(res).toHaveLength(8)
    })

    it('should return events by pos', async () => {
      const res = await eventsDb.getAllEvents(2, 5)
      expect(res).toHaveLength(4)
      expect(res[0].position).toEqual(2)
      expect(res[1].position).toEqual(3)
      expect(res[2].position).toEqual(4)
      expect(res[3].position).toEqual(5)
    })

    it('should return single event if fromPos is same as toPos', async () => {
      const res = await eventsDb.getAllEvents(3, 3)
      expect(res).toHaveLength(1)
      expect(res[0].position).toEqual(3)
    })

    it('should return all events even if toPos is more than max pos', async () => {
      const res = await eventsDb.getAllEvents(3, 30)
      expect(res).toHaveLength(8)
    })

    it('should return error if fromPos is greater than toPos', async () => {
      expect.assertions(1)
      try {
        await eventsDb.getAllEvents(3, 2)
      } catch (e) {
        expect(e).toEqual(
          new InvalidQueryError('from should not be greater than to')
        )
      }
    })

    it('should return error if fromPos is less than 1', async () => {
      expect.assertions(1)
      try {
        await eventsDb.getAllEvents(0, 2)
      } catch (e) {
        expect(e).toEqual(
          new InvalidQueryError('from should be greater than 0')
        )
      }
    })
  })

  describe('getAllEvents by type', () => {
    it('should return all events within default limit if no limit and offset is passed', async () => {
      const res = await eventsDb.getEventsByType('product')
      expect(res).toHaveLength(7)
    })

    it('should return all events from beginning till given limit', async () => {
      const res = await eventsDb.getEventsByType('product', 5)
      expect(res).toHaveLength(5)
      expect(res[0].position).toEqual(1)
      expect(res[4].position).toEqual(6)
    })

    it('should return all events from beginning till given limit if limit is exactly same as total count', async () => {
      const res = await eventsDb.getEventsByType('product', 7)
      expect(res).toHaveLength(7)
      expect(res[0].position).toEqual(1)
      expect(res[6].position).toEqual(10)
    })

    it('should return all events starting at offset till limit', async () => {
      const res = await eventsDb.getEventsByType('product', 3, 2)
      expect(res).toHaveLength(3)
      expect(res[0].position).toEqual(3)
      expect(res[2].position).toEqual(6)
    })

    it('should return single event if limit is one', async () => {
      const res = await eventsDb.getEventsByType('product', 1, 3)
      expect(res).toHaveLength(1)
      expect(res[0].position).toEqual(5)
    })

    it('should return error if offset is less than 0', async () => {
      expect.assertions(1)
      try {
        await eventsDb.getEventsByType('product', 3, -1)
      } catch (e) {
        expect(e).toEqual(
          new InvalidQueryError('offset should be a positive number')
        )
      }
    })

    it('should return error if limit is less than 1', async () => {
      expect.assertions(1)
      try {
        await eventsDb.getEventsByType('product', 0, 2)
      } catch (e) {
        expect(e).toEqual(
          new InvalidQueryError('limit should be greater than 0')
        )
      }
    })
  })

  describe('getEventsById', () => {
    it('should return all events if no range is passed', async () => {
      const res = await eventsDb.getEventsById(
        'cd452c3b-7d6f-49f5-b9cb-1a906d21f7e3'
      )
      expect(res).toHaveLength(3)
      expect(res[0].position).toEqual(2)
      expect(res[1].position).toEqual(7)
      expect(res[2].position).toEqual(10)
    })

    it('should return all events starting at fromRev if no toRev is passed', async () => {
      const res = await eventsDb.getEventsById(
        'cd452c3b-7d6f-49f5-b9cb-1a906d21f7e3',
        2
      )
      expect(res).toHaveLength(2)
      expect(res[0].position).toEqual(7)
      expect(res[0].revision).toEqual(2)
      expect(res[1].position).toEqual(10)
      expect(res[1].revision).toEqual(3)
    })

    it('should return all events starting at fromRev if toRev is -1', async () => {
      const res = await eventsDb.getEventsById(
        'cd452c3b-7d6f-49f5-b9cb-1a906d21f7e3',
        2,
        -1
      )
      expect(res).toHaveLength(2)
      expect(res[0].position).toEqual(7)
      expect(res[0].revision).toEqual(2)
      expect(res[1].position).toEqual(10)
      expect(res[1].revision).toEqual(3)
    })

    it('should return events by pos', async () => {
      const res = await eventsDb.getEventsById(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2',
        2,
        3
      )
      expect(res).toHaveLength(2)
      expect(res[0].position).toEqual(3)
      expect(res[0].revision).toEqual(2)
      expect(res[1].position).toEqual(5)
      expect(res[1].revision).toEqual(3)
    })

    it('should return single event if fromRev is same as toRev', async () => {
      const res = await eventsDb.getEventsById(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2',
        3,
        3
      )
      expect(res).toHaveLength(1)
      expect(res[0].position).toEqual(5)
      expect(res[0].revision).toEqual(3)
    })

    it('should return all events even if toRev is more than max rev', async () => {
      const res = await eventsDb.getEventsById(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2',
        3,
        30
      )
      expect(res).toHaveLength(2)
      expect(res[0].position).toEqual(5)
      expect(res[0].revision).toEqual(3)
      expect(res[1].position).toEqual(6)
      expect(res[1].revision).toEqual(4)
    })

    it('should return error if fromRev is greater than toRev', async () => {
      expect.assertions(1)
      try {
        await eventsDb.getEventsById(
          '49b1ddf5-f234-4e31-9342-75713e6b43c2',
          3,
          2
        )
      } catch (e) {
        expect(e).toEqual(
          new InvalidQueryError('from should not be greater than to')
        )
      }
    })

    it('should return error if fromRev is less than 1', async () => {
      expect.assertions(1)
      try {
        await eventsDb.getEventsById(
          '49b1ddf5-f234-4e31-9342-75713e6b43c2',
          0,
          2
        )
      } catch (e) {
        expect(e).toEqual(
          new InvalidQueryError('from should be greater than 0')
        )
      }
    })
  })

  describe('getLastEvent', () => {
    it('should return last event if available', async () => {
      const res = await eventsDb.getLastEvent(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2'
      )
      expect(res.position).toEqual(6)
      expect(res.revision).toEqual(4)
    })

    it('should return no event if no event happened', async () => {
      const res = await eventsDb.getLastEvent('some-id')
      expect(res).toBeUndefined()
    })
  })

  describe('saveEvents', () => {
    it('should save the events', async () => {
      const eventsToSave = [
        {
          aggregateId: '650f1a5c-d989-46ad-8231-82c558d7319d',
          aggregate: 'product',
          commitId: 'df06d169-d96e-4fc6-822b-8bd3a19253be',
          revision: 1,
          payload: '{}',
        },
        {
          aggregateId: '0080fedc-f59d-4480-a1bc-73daf4709307',
          aggregate: 'user',
          commitId: 'df06d169-d96e-4fc6-822b-8bd3a19253be',
          revision: 3,
          payload: '{}',
        },
      ]
      await eventsDb.saveEvents(eventsToSave)

      const res = await eventsDb.getAllEvents()
      expect(res).toHaveLength(12)
      expect(res[10].aggregateId).toEqual(
        '650f1a5c-d989-46ad-8231-82c558d7319d'
      )
      expect(res[11].aggregateId).toEqual(
        '0080fedc-f59d-4480-a1bc-73daf4709307'
      )

      await deleteEventsByRevAndId(eventsToSave)

      expect(await eventsDb.getAllEvents()).toHaveLength(10)
    })

    it('should return error if revision already exist', async () => {
      expect(await eventsDb.getAllEvents()).toHaveLength(10)

      try {
        await eventsDb.saveEvents([
          {
            aggregateId: '650f1a5c-d989-46ad-8231-82c558d7319d',
            aggregate: 'product',
            commitId: 'df06d169-d96e-4fc6-822b-8bd3a19253be',
            revision: 1,
            payload: '{}',
          },
          {
            aggregateId: '0080fedc-f59d-4480-a1bc-73daf4709307',
            aggregate: 'user',
            commitId: 'df06d169-d96e-4fc6-822b-8bd3a19253be',
            revision: 2,
            payload: '{}',
          },
        ])
      } catch (e) {
        expect(
          e.message.includes(
            'Unique constraint on aggregateId-revision failed on one of the events in'
          )
        ).toBeTruthy()

        expect(await eventsDb.getAllEvents()).toHaveLength(10)
      }
    })
  })

  const initDatabase = async (): Promise<any> => {
    const db = connectDb()
    await createTable(db)
    await seedData(db)
    return db.destroy()
  }

  const clearDatabase = async (): Promise<any> => {
    const db = connectDb()
    await deleteTable(db)
    return db.destroy()
  }

  const connectDb = (): knex => {
    return knex({
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
  }

  const createTable = (db: knex) => {
    return db.migrate.latest({
      directory: './src/databases/mysql/setup/migrations',
    })
  }

  const seedData = (db: knex) => {
    return db.seed.run({
      directory: './src/databases/mysql/tests/int/seeds',
    })
  }

  const deleteTable = (db: knex) => {
    return db.migrate.rollback({
      directory: './src/databases/mysql/setup/migrations',
    })
  }

  const deleteEventsByRevAndId = async (data: EventToSave[]): Promise<any> => {
    const db = connectDb()
    await Promise.all(
      data.map(async d => {
        return db(tableName)
          .where('revision', d.revision)
          .andWhere('aggregateId', d.aggregateId)
          .delete()
      })
    )
    return db.destroy()
  }
})
