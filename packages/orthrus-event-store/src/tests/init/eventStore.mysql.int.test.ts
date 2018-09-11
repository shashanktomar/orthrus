import knex from 'knex'
import { MysqlConfig } from '../../databases/types'
import EventStore from '../../'
import { InvalidQueryError } from '../../errors'
import { NewEvent, IEventStore } from '../../types'

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
  let eventStore: IEventStore = null
  let initialTableName

  beforeAll(() => {
    initialTableName = process.env.ORTHRUS_EVENT_STORE_TABLE
    process.env.ORTHRUS_EVENT_STORE_TABLE = tableName
    eventStore = new EventStore(config)
    return initDatabase()
  })

  afterAll(async () => {
    await eventStore.destroy()
    return clearDatabase().then(
      () => (process.env.ORTHRUS_EVENT_STORE_TABLE = initialTableName)
    )
  })

  describe('getAllEvents', () => {
    it('should fetch all events if page size is bigger than total values', async () => {
      const eventsPage = eventStore.getAllEvents(1, -1, 100)
      let result = await eventsPage.next()
      expect(result.done).toBeTruthy()
      expect(result.value).toHaveLength(10)
      expect(result.value[0].streamName).toEqual('orthrus-events')
      expect(result.value[0].streamVersion).toEqual('1-0-0')

      result = await eventsPage.next()
      expect(result.done).toBeTruthy()
      expect(result.value).toHaveLength(0)
    })

    it('should fetch all events if page size is bigger than toPos', async () => {
      const eventsPage = eventStore.getAllEvents(1, 3, 100)
      const result = await eventsPage.next()
      expect(result.done).toBeTruthy()
      expect(result.value).toHaveLength(3)
      expect(result.value[0].position).toEqual(1)
      expect(result.value[2].position).toEqual(3)
    })

    it('should fetch all events if page size is same as total expected values', async () => {
      const eventsPage = eventStore.getAllEvents(1, 3, 4)
      const result = await eventsPage.next()
      expect(result.done).toBeTruthy()
      expect(result.value).toHaveLength(3)
      expect(result.value[0].position).toEqual(1)
      expect(result.value[2].position).toEqual(3)
    })

    it('should fetch pages one', async () => {
      const eventsPage = eventStore.getAllEvents(1, 6, 2)
      let result = await eventsPage.next()
      expect(result.done).toBeFalsy()
      expect(result.value).toHaveLength(2)
      expect(result.value[0].position).toEqual(1)
      expect(result.value[1].position).toEqual(2)

      result = await eventsPage.next()
      expect(result.done).toBeFalsy()
      expect(result.value).toHaveLength(2)
      expect(result.value[0].position).toEqual(3)
      expect(result.value[1].position).toEqual(4)

      result = await eventsPage.next()
      expect(result.done).toBeTruthy()
      expect(result.value).toHaveLength(2)
      expect(result.value[0].position).toEqual(5)
      expect(result.value[1].position).toEqual(6)
    })

    it('should fetch pages two', async () => {
      const eventsPage = eventStore.getAllEvents(3, 9, 3)
      let result = await eventsPage.next()
      expect(result.done).toBeFalsy()
      expect(result.value).toHaveLength(3)
      expect(result.value[0].position).toEqual(3)
      expect(result.value[1].position).toEqual(4)
      expect(result.value[2].position).toEqual(5)

      result = await eventsPage.next()
      expect(result.done).toBeFalsy()
      expect(result.value).toHaveLength(3)
      expect(result.value[0].position).toEqual(6)
      expect(result.value[1].position).toEqual(7)
      expect(result.value[2].position).toEqual(8)

      result = await eventsPage.next()
      expect(result.done).toBeTruthy()
      expect(result.value).toHaveLength(1)
      expect(result.value[0].position).toEqual(9)
    })

    it('should fetch pages three', async () => {
      const eventsPage = eventStore.getAllEvents(2, 2, 1)
      const result = await eventsPage.next()
      expect(result.done).toBeTruthy()
      expect(result.value).toHaveLength(1)
      expect(result.value[0].position).toEqual(2)
    })

    it('should return error if fromPos is less than 1', async () => {
      try {
        eventStore.getAllEvents(0, 2, 1)
      } catch (e) {
        expect(e).toEqual(
          new InvalidQueryError('fromPos should be greater than 0')
        )
      }
    })

    it('should return error if toPos is less than fromPos', async () => {
      try {
        eventStore.getAllEvents(2, 1, 1)
      } catch (e) {
        expect(e).toEqual(
          new InvalidQueryError('fromPos should not be greater than toPos')
        )
      }
    })

    it('should return error if pageSize is not greater than 0', async () => {
      try {
        eventStore.getAllEvents(2, 3, 0)
      } catch (e) {
        expect(e).toEqual(
          new InvalidQueryError('pageSize should be greater than 0')
        )
      }
    })
  })

  describe('getEventsByType', () => {
    it('should fetch all events if page size is bigger than total values', async () => {
      const eventsPage = eventStore.getEventsByType('product', 100)
      let result = await eventsPage.next()
      expect(result.done).toBeTruthy()
      expect(result.value).toHaveLength(7)

      result = await eventsPage.next()
      expect(result.done).toBeTruthy()
      expect(result.value).toHaveLength(0)
    })

    it('should fetch all events if page size is same as total expected values', async () => {
      const eventsPage = eventStore.getEventsByType('product', 7)
      const result = await eventsPage.next()
      expect(result.done).toBeTruthy()
      expect(result.value).toHaveLength(7)

      expect(result.value[0].position).toEqual(1)
      expect(result.value[6].position).toEqual(10)
    })

    it('should fetch pages one', async () => {
      const eventsPage = eventStore.getEventsByType('product', 2)
      let result = await eventsPage.next()
      expect(result.done).toBeFalsy()
      expect(result.value).toHaveLength(2)
      expect(result.value[0].position).toEqual(1)
      expect(result.value[1].position).toEqual(2)

      result = await eventsPage.next()
      expect(result.done).toBeFalsy()
      expect(result.value).toHaveLength(2)
      expect(result.value[0].position).toEqual(3)
      expect(result.value[1].position).toEqual(5)

      result = await eventsPage.next()
      expect(result.done).toBeFalsy()
      expect(result.value).toHaveLength(2)
      expect(result.value[0].position).toEqual(6)
      expect(result.value[1].position).toEqual(7)

      result = await eventsPage.next()
      expect(result.done).toBeTruthy()
      expect(result.value).toHaveLength(1)
      expect(result.value[0].position).toEqual(10)
    })

    it('should return error if pageSize is not greater than 0', async () => {
      try {
        const eventsPage = eventStore.getEventsByType('product', 0)
      } catch (e) {
        expect(e).toEqual(
          new InvalidQueryError('pageSize should be greater than 0')
        )
      }
    })
  })

  describe('getAllEventsById', () => {
    it('should fetch all events if page size is bigger than total values', async () => {
      const eventsPage = eventStore.getEventsById(
        'cd452c3b-7d6f-49f5-b9cb-1a906d21f7e3',
        100,
        1,
        -1
      )
      let result = await eventsPage.next()
      expect(result.done).toBeTruthy()
      expect(result.value).toHaveLength(3)
      expect(result.value[0].aggregateId).toEqual(
        'cd452c3b-7d6f-49f5-b9cb-1a906d21f7e3'
      )

      result = await eventsPage.next()
      expect(result.done).toBeTruthy()
      expect(result.value).toHaveLength(0)
    })

    it('should fetch all events if page size is bigger than toRev', async () => {
      const eventsPage = eventStore.getEventsById(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2',
        10,
        2,
        4
      )
      const result = await eventsPage.next()
      expect(result.done).toBeTruthy()
      expect(result.value).toHaveLength(3)
      expect(result.value[0].revision).toEqual(2)
      expect(result.value[0].aggregateId).toEqual(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2'
      )
      expect(result.value[2].revision).toEqual(4)
      expect(result.value[2].aggregateId).toEqual(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2'
      )
    })

    it('should fetch all events if page size is same as total expected values', async () => {
      const eventsPage = eventStore.getEventsById(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2',
        3,
        2,
        4
      )
      const result = await eventsPage.next()
      expect(result.done).toBeTruthy()
      expect(result.value).toHaveLength(3)
      expect(result.value[0].revision).toEqual(2)
      expect(result.value[0].aggregateId).toEqual(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2'
      )
      expect(result.value[2].revision).toEqual(4)
      expect(result.value[2].aggregateId).toEqual(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2'
      )
    })

    it('should fetch pages one', async () => {
      const eventsPage = eventStore.getEventsById(
        'cd452c3b-7d6f-49f5-b9cb-1a906d21f7e3',
        2,
        1,
        -1
      )
      let result = await eventsPage.next()
      expect(result.done).toBeFalsy()
      expect(result.value).toHaveLength(2)
      expect(result.value[0].revision).toEqual(1)
      expect(result.value[0].aggregateId).toEqual(
        'cd452c3b-7d6f-49f5-b9cb-1a906d21f7e3'
      )
      expect(result.value[1].revision).toEqual(2)
      expect(result.value[1].aggregateId).toEqual(
        'cd452c3b-7d6f-49f5-b9cb-1a906d21f7e3'
      )

      result = await eventsPage.next()
      expect(result.done).toBeTruthy()
      expect(result.value).toHaveLength(1)
      expect(result.value[0].revision).toEqual(3)
      expect(result.value[0].aggregateId).toEqual(
        'cd452c3b-7d6f-49f5-b9cb-1a906d21f7e3'
      )
    })

    it('should fetch pages two', async () => {
      const eventsPage = eventStore.getEventsById(
        'dfe2bbcc-506f-49d6-a450-0836a9aa5506',
        2
      )
      const result = await eventsPage.next()
      expect(result.done).toBeTruthy()
      expect(result.value).toHaveLength(1)
      expect(result.value[0].revision).toEqual(1)
      expect(result.value[0].aggregateId).toEqual(
        'dfe2bbcc-506f-49d6-a450-0836a9aa5506'
      )
    })

    it('should return error if fromPos is less than 1', async () => {
      try {
        const eventsPage = eventStore.getEventsById(
          'dfe2bbcc-506f-49d6-a450-0836a9aa5506',
          2,
          0
        )
      } catch (e) {
        expect(e).toEqual(
          new InvalidQueryError('fromPos should be greater than 0')
        )
      }
    })

    it('should return error if toPos is less than fromPos', async () => {
      try {
        const eventsPage = eventStore.getEventsById(
          'dfe2bbcc-506f-49d6-a450-0836a9aa5506',
          2,
          2,
          1
        )
      } catch (e) {
        expect(e).toEqual(
          new InvalidQueryError('fromPos should not be greater than toPos')
        )
      }
    })

    it('should return error if pageSize is not greater than 0', async () => {
      try {
        const eventsPage = eventStore.getEventsById(
          'dfe2bbcc-506f-49d6-a450-0836a9aa5506',
          0,
          2
        )
      } catch (e) {
        expect(e).toEqual(
          new InvalidQueryError('pageSize should be greater than 0')
        )
      }
    })
  })

  describe('getLastEvent', () => {
    it('should return last event if available', async () => {
      const res = await eventStore.getLastEvent(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2'
      )
      expect(res.position).toEqual(6)
      expect(res.revision).toEqual(4)
    })

    it('should return no event if no event happened', async () => {
      const res = await eventStore.getLastEvent('some-id')
      expect(res).toBeUndefined()
    })
  })

  describe('saveEvents', () => {
    it('should save the events', async () => {
      const eventsToSave = [
        {
          aggregateId: '650f1a5c-d989-46ad-8231-82c558d7319d',
          aggregate: 'product',
          revision: 1,
          payload: '{}',
        },
        {
          aggregateId: '0080fedc-f59d-4480-a1bc-73daf4709307',
          aggregate: 'user',
          revision: 3,
          payload: '{}',
        },
      ]
      await eventStore.saveEvents(eventsToSave)

      let resPage = eventStore.getAllEvents()
      let res = await resPage.next()
      expect(res.value).toHaveLength(12)
      expect(res.value[10].aggregateId).toEqual(
        '650f1a5c-d989-46ad-8231-82c558d7319d'
      )
      expect(res.value[11].aggregateId).toEqual(
        '0080fedc-f59d-4480-a1bc-73daf4709307'
      )

      await deleteEventsByRevAndId(eventsToSave)

      resPage = eventStore.getAllEvents()
      res = await resPage.next()
      expect(res.value).toHaveLength(10)
    })

    it('should return error if revision already exist', async () => {
      let resPage = eventStore.getAllEvents()
      let res = await resPage.next()
      expect(res.value).toHaveLength(10)

      try {
        await eventStore.saveEvents([
          {
            aggregateId: '650f1a5c-d989-46ad-8231-82c558d7319d',
            aggregate: 'product',
            revision: 1,
            payload: '{}',
          },
          {
            aggregateId: '0080fedc-f59d-4480-a1bc-73daf4709307',
            aggregate: 'user',
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

        resPage = eventStore.getAllEvents()
        res = await resPage.next()
        expect(res.value).toHaveLength(10)
      }
    })
  })

  describe('saveEvent', () => {
    it('should save the event', async () => {
      const newEvent = {
        aggregateId: '650f1a5c-d989-46ad-8231-82c558d7319d',
        aggregate: 'product',
        revision: 1,
        payload: '{}',
      }
      await eventStore.saveEvent(newEvent)

      let resPage = eventStore.getAllEvents()
      let res = await resPage.next()
      expect(res.value).toHaveLength(11)
      expect(res.value[10].aggregateId).toEqual(
        '650f1a5c-d989-46ad-8231-82c558d7319d'
      )

      await deleteEventsByRevAndId([newEvent])

      resPage = eventStore.getAllEvents()
      res = await resPage.next()
      expect(res.value).toHaveLength(10)
    })

    it('should return error if revision already exist', async () => {
      let resPage = eventStore.getAllEvents()
      let res = await resPage.next()
      expect(res.value).toHaveLength(10)

      try {
        await eventStore.saveEvent({
          aggregateId: '0080fedc-f59d-4480-a1bc-73daf4709307',
          aggregate: 'user',
          revision: 2,
          payload: '{}',
        })
      } catch (e) {
        expect(
          e.message.includes(
            'Unique constraint on aggregateId-revision failed on one of the events in'
          )
        ).toBeTruthy()

        resPage = eventStore.getAllEvents()
        res = await resPage.next()
        expect(res.value).toHaveLength(10)
      }
    })
  })

  describe('getEventStreamById', () => {
    it('should have valid last event and revision', async () => {
      const stream = await eventStore.getEventStream(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2',
        'product'
      )
      expect(stream.lastEvent.aggregateId).toEqual(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2'
      )
      expect(stream.revision).toEqual(4)
    })

    it('should have undefined last event and revision for new commitId', async () => {
      const stream = await eventStore.getEventStream('abc', 'product')
      expect(stream.lastEvent).toBeUndefined()
      expect(stream.revision).toBeUndefined()
    })

    it('should return events object which resolve to valid events', async () => {
      const stream = await eventStore.getEventStream(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2',
        'product',
        10,
        2
      )
      const events = await stream.events.next()
      expect(events.value).toHaveLength(3)
      expect(events.done).toBeTruthy()
    })

    it('should save new event with proper data', async () => {
      const stream = await eventStore.getEventStream(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2',
        'product'
      )
      let events = await stream.events.next()
      expect(events.value).toHaveLength(4)

      stream.save('{}')
      await stream.commit()
      stream.save('{}')

      let eventsPage = await eventStore.getEventsById(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2'
      )
      events = await eventsPage.next()
      expect(events.value).toHaveLength(5)
      expect(events.value[4].revision).toEqual(5)
      expect(events.value[4].aggregate).toEqual('product')
      expect(events.value[4].aggregateId).toEqual(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2'
      )

      await stream.commit()

      eventsPage = await eventStore.getEventsById(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2'
      )
      events = await eventsPage.next()
      expect(events.value).toHaveLength(6)
      expect(events.value[5].revision).toEqual(6)
      expect(events.value[5].aggregate).toEqual('product')
      expect(events.value[5].aggregateId).toEqual(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2'
      )

      await deleteEventsByRevAndId([
        { revision: 5, aggregateId: '49b1ddf5-f234-4e31-9342-75713e6b43c2' },
        { revision: 6, aggregateId: '49b1ddf5-f234-4e31-9342-75713e6b43c2' },
      ])

      const resPage = eventStore.getAllEvents()
      const res = await resPage.next()
      expect(res.value).toHaveLength(10)
    })

    it('should save new events with proper data', async () => {
      const stream = await eventStore.getEventStream(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2',
        'product'
      )
      let events = await stream.events.next()
      expect(events.value).toHaveLength(4)

      stream.saveAll(['{}', '{}'])
      await stream.commit()
      stream.save('{}')

      let eventsPage = await eventStore.getEventsById(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2'
      )
      events = await eventsPage.next()
      expect(events.value).toHaveLength(6)
      expect(events.value[4].revision).toEqual(5)
      expect(events.value[4].aggregate).toEqual('product')
      expect(events.value[4].aggregateId).toEqual(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2'
      )
      expect(events.value[5].revision).toEqual(6)
      expect(events.value[5].aggregate).toEqual('product')
      expect(events.value[5].aggregateId).toEqual(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2'
      )

      await stream.commit()

      eventsPage = await eventStore.getEventsById(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2'
      )
      events = await eventsPage.next()
      expect(events.value).toHaveLength(7)
      expect(events.value[6].revision).toEqual(7)
      expect(events.value[6].aggregate).toEqual('product')
      expect(events.value[6].aggregateId).toEqual(
        '49b1ddf5-f234-4e31-9342-75713e6b43c2'
      )

      await deleteEventsByRevAndId([
        {
          revision: 5,
          aggregateId: '49b1ddf5-f234-4e31-9342-75713e6b43c2',
        },
        {
          revision: 6,
          aggregateId: '49b1ddf5-f234-4e31-9342-75713e6b43c2',
        },
        {
          revision: 7,
          aggregateId: '49b1ddf5-f234-4e31-9342-75713e6b43c2',
        },
      ])

      const resPage = eventStore.getAllEvents()
      const res = await resPage.next()
      expect(res.value).toHaveLength(10)
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
    return db.seed.run({ directory: './src/databases/mysql/tests/int/seeds' })
  }

  const deleteTable = (db: knex) => {
    return db.migrate.rollback({
      directory: './src/databases/mysql/setup/migrations',
    })
  }

  const deleteEventsByRevAndId = async (data: EventId[]): Promise<any> => {
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

  interface EventId {
    revision: number
    aggregateId: string
  }
})
