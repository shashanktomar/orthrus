import { v4 as uuid } from 'uuid'
import MySqlEventsDb from './databases/mysql'
import {
  EventsDb,
  InMemoryConfig,
  MysqlConfig,
  EventRetrieved,
} from './databases/types'
import { IEventStore, Events, Event, NewEvent, EventStream } from './types'
import { InvalidQueryError } from './errors'

const INVALID_POS = -1

export default class EventStore implements IEventStore {
  public eventsDb!: EventsDb
  public config: InMemoryConfig | MysqlConfig
  public eventDecorator: (events: EventRetrieved[]) => Event[]

  constructor(config: MysqlConfig | InMemoryConfig) {
    this.config = config
    this.eventDecorator = decorateEvents(config)
    switch (config.type) {
      case 'mysql':
        this.eventsDb = new MySqlEventsDb(config)
        break
    }
  }

  public destroy(): Promise<void> {
    return this.eventsDb.destroy()
  }

  public getAllEvents(
    fromPos: number = 1,
    toPos: number = INVALID_POS,
    pageSize: number = 100
  ): Events {
    return getEvents(
      fromPos,
      toPos,
      pageSize,
      async (nextFromPos: number, nextToPos: number): Promise<Event[]> => {
        const results = await this.eventsDb.getAllEvents(nextFromPos, nextToPos)
        return Promise.resolve(this.eventDecorator(results))
      }
    )
  }

  public getEventsByType(aggregate: string, pageSize: number): Events {
    if (pageSize <= 0) {
      throw new InvalidQueryError('pageSize should be greater than 0')
    }

    let hasMoreItems = true
    let nextOffset = 0
    return {
      next: async () => {
        if (!hasMoreItems) {
          return Promise.resolve({
            value: [],
            done: true,
          })
        }
        // we fetch one extra item on purpose, to check if next page is available
        const events = this.eventDecorator(
          await this.eventsDb.getEventsByType(
            aggregate,
            pageSize + 1,
            nextOffset
          )
        )
        hasMoreItems = events.length > pageSize
        nextOffset += pageSize
        return Promise.resolve({
          value: hasMoreItems ? events.slice(0, events.length - 1) : events,
          done: !hasMoreItems,
        })
      },
    }
  }

  public getEventsById(
    aggregateId: string,
    pageSize: number = 100,
    fromRev: number = 1,
    toRev: number = INVALID_POS
  ): Events {
    return getEvents(
      fromRev,
      toRev,
      pageSize,
      async (nextFromPos: number, nextToPos: number): Promise<Event[]> => {
        const results = this.eventDecorator(
          await this.eventsDb.getEventsById(aggregateId, nextFromPos, nextToPos)
        )
        return Promise.resolve(results)
      }
    )
  }

  public getLastEvent(aggregateId: string): Promise<Event | undefined> {
    return this.eventsDb.getLastEvent(aggregateId).then(e => {
      if (!e) return undefined
      return {
        ...e,
        streamName: this.config.streamName,
        streamVersion: this.config.streamVersion,
      }
    })
  }

  public saveEvent(event: NewEvent): Promise<void> {
    const eventToSave = {
      ...event,
      commitId: uuid(),
      payload: JSON.stringify(event.payload),
    }
    return this.eventsDb.saveEvents([eventToSave])
  }

  public saveEvents(events: NewEvent[]): Promise<void> {
    const commitId = uuid()
    const eventsToSave = events.map(e => ({
      ...e,
      commitId,
      payload: JSON.stringify(e.payload),
    }))
    return this.eventsDb.saveEvents(eventsToSave)
  }

  public async getEventStream(
    aggregateId: string,
    aggregate: string,
    pageSize: number,
    fromRev: number,
    toRev: number
  ): Promise<EventStream> {
    const lastEvent = await this.getLastEvent(aggregateId)
    let eventsToSave: NewEvent[] = []
    let nextRev = lastEvent ? lastEvent.revision + 1 : 1
    return Promise.resolve({
      revision: lastEvent ? lastEvent.revision : undefined,
      events: this.getEventsById(aggregateId, pageSize, fromRev, toRev),
      lastEvent,
      save: (payload: string): void => {
        eventsToSave.push({
          aggregateId,
          aggregate,
          revision: nextRev++,
          payload,
        })
      },
      saveAll: (payloads: string[]): void => {
        const events = payloads.map(payload => ({
          aggregateId,
          aggregate,
          revision: nextRev++,
          payload,
        }))
        eventsToSave.push(...events)
      },
      commit: async (): Promise<void> => {
        await this.saveEvents(eventsToSave)
        eventsToSave = []
      },
    })
  }
}

const getEvents = (
  from: number,
  to: number,
  pageSize: number,
  eventSource: EventSource
) => {
  if (from < 1) {
    throw new InvalidQueryError('fromPos should be greater than 0')
  }

  if (to !== INVALID_POS && from > to) {
    throw new InvalidQueryError('fromPos should not be greater than toPos')
  }

  if (pageSize <= 0) {
    throw new InvalidQueryError('pageSize should be greater than 0')
  }

  let hasMoreItems = true
  let nextFromPos = from
  return {
    next: async () => {
      if (!hasMoreItems) {
        return Promise.resolve({ value: [], done: true })
      }
      // we fetch one extra item on purpose, to check if next page is available
      let nextToPos = nextFromPos + pageSize
      if (to !== INVALID_POS) {
        nextToPos = Math.min(nextToPos, to)
      }
      const events = await eventSource(nextFromPos, nextToPos)
      hasMoreItems = events.length > pageSize
      nextFromPos = nextToPos
      return Promise.resolve({
        value: hasMoreItems ? events.slice(0, events.length - 1) : events,
        done: !hasMoreItems,
      })
    },
  }
}

const decorateEvents = (config: {
  streamName: string
  streamVersion: string
}) => (events: EventRetrieved[]): Event[] =>
  events.map(e => ({
    ...e,
    streamName: config.streamName,
    streamVersion: config.streamVersion,
  }))

type EventSource = (nextFromPos: number, nextToPos: number) => Promise<Event[]>
