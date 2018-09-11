import { v4 as uuid } from 'uuid'
import { Event, NewEvent } from '../../types'
import { EventsDb, InMemoryConfig } from '../types'

export default class InMemoryDb implements EventsDb {
  public position: number
  private db: { streamName: string; streamVersion: string; events: Event[] }

  constructor(config: InMemoryConfig) {
    this.db = {
      streamName: config.streamName,
      streamVersion: config.streamVersion,
      events: [],
    }
    this.position = 1
  }

  public destroy(): void {
    this.db.events = []
  }

  public *getEventsById(
    aggregateId: string,
    fromRev: number = 1,
    toRev: number = Infinity,
    pageSize: number = 100
  ): IterableIterator<Event[]> {
    if (fromRev > toRev) {
      throw Error('fromRev should not be greater that toRev')
    }

    if (pageSize <= 0) {
      throw Error('pageSize should be greater than 0')
    }

    const filteredEvents = eventsById(this.db.events, aggregateId)
    const totalEvents = filteredEvents.length
    if (totalEvents <= pageSize) {
      return filteredEvents
    }

    let pos = 0
    while (pos + pageSize < totalEvents) {
      yield filteredEvents.slice(pos, pos + pageSize)
      pos += pageSize
    }
    return filteredEvents.slice(pos, totalEvents)
  }

  public *getEventsByType(
    aggregateName: string,
    fromRev: number = 1,
    toRev: number = Infinity,
    pageSize: number = 100
  ): IterableIterator<Event> {
    const filteredEvents = eventsByName(this.db.events, aggregateName)
    return getEvents(filteredEvents, fromRev, toRev, pageSize)
  }

  public getLastEvent(aggregateId: string): Promise<Event | undefined> {
    const filteredEvents = eventsById(this.db.events, aggregateId)
    if (filteredEvents.length === 0) {
      return Promise.resolve(undefined)
    }
    return Promise.resolve(filteredEvents[filteredEvents.length - 1])
  }

  public saveEvents(newEvents: NewEvent[]): Promise<Event[]> {
    if (newEvents.length === 0) {
      return Promise.resolve([])
    }

    const commitId = uuid()
    const commitStamp = new Date()
    const streamName = this.db.streamName
    const streamVersion = this.db.streamVersion

    const events = newEvents.map(e => ({
      ...e,
      id: uuid(),
      commitId,
      commitStamp,
      streamName,
      streamVersion,
      position: this.position++,
    }))
    return Promise.resolve(events)
  }
}

const eventsById = (events: Event[], aggregateId: string) =>
  events.filter(e => e.aggregateId === aggregateId)

const eventsByName = (events: Event[], aggregateName: string) =>
  events.filter(e => e.aggregateName === aggregateName)

function* getEvents(
  events: Event[],
  fromRev: number,
  toRev: number,
  pageSize: number
): IterableIterator<Event[]> {
  if (fromRev > toRev) {
    throw Error('fromRev should not be greater that toRev')
  }

  if (pageSize <= 0) {
    throw Error('pageSize should be greater than 0')
  }

  const totalEvents = events.length
  if (totalEvents <= pageSize) {
    return events
  }

  let pos = 0
  while (pos + pageSize < totalEvents) {
    yield events.slice(pos, pos + pageSize)
    pos += pageSize
  }
  return events.slice(pos, totalEvents)
}
