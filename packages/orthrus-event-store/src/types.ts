// tslint:disable:interface-name
export interface IEventStore {
  destroy(): Promise<void>

  getAllEvents(fromPos?: number, toPos?: number, pageSize?: number): Events

  getEventsByType(aggregate: string, pageSize?: number): Events

  getEventsById(
    aggregateId: string,
    pageSize?: number,
    fromRev?: number,
    toRev?: number
  ): Events

  getLastEvent(aggregateId: string): Promise<Event | undefined>

  saveEvent(event: NewEvent): Promise<void>

  saveEvents(events: NewEvent[]): Promise<void>

  getEventStream(
    aggregateId: string,
    aggregate: string,
    pageSize?: number,
    fromRev?: number,
    toRev?: number
  ): Promise<EventStream>
}
// tslint:enable:interface-name

export interface EventStream {
  revision: number | undefined
  events: Events
  lastEvent: Event | undefined
  save(payload: string): void
  saveAll(payload: string[]): void
  commit(): Promise<void>
}

export interface Event {
  readonly position: number // Unique within whole stream, always increase
  readonly aggregateId: string
  readonly aggregate: string
  readonly commitId: string // The id of the commit as part of which the event was saved
  readonly createdAt: Date // Date-time of commit in iso-8601 format
  readonly revision: number // Unique within aggregate id, always increase, starts at 1
  readonly streamName: string // Name of the stream
  readonly streamVersion: string // The version of the stream
  readonly payload: string
}

export interface NewEvent {
  readonly aggregateId: string
  readonly aggregate: string
  readonly revision: number
  readonly payload: string
}

export interface Events {
  next(): Promise<{
    value: Event[]
    done: boolean
  }>
}
