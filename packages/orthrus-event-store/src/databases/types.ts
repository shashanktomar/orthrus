export interface EventsDb {
  destroy(): Promise<void>

  getAllEvents(fromPos?: number, toPos?: number): Promise<EventRetrieved[]>

  getEventsByType(
    aggregate: string,
    fromPos?: number,
    toPos?: number
  ): Promise<EventRetrieved[]>

  getEventsById(
    aggregateId: string,
    fromRev?: number,
    toRev?: number
  ): Promise<EventRetrieved[]>

  getLastEvent(aggregateId: string): Promise<EventRetrieved | undefined>

  saveEvents(events: EventToSave[]): Promise<void>
}

export interface MysqlConfig {
  readonly type: 'mysql'
  readonly host: string
  readonly port?: number
  readonly user: string
  readonly password: string
  readonly database: string
  readonly streamName: string
  readonly streamVersion: string
  readonly pool?: {
    min: number
    max: number
  }
}

export interface InMemoryConfig {
  readonly type: 'in-memory'
  readonly streamName: string
  readonly streamVersion: string
}

export type DbConfig = MysqlConfig | InMemoryConfig

export interface EventToSave {
  readonly aggregateId: string
  readonly aggregate: string
  readonly commitId: string
  readonly revision: number
  readonly payload: string
}

export type EventRetrieved = EventToSave & {
  readonly position: number
  readonly createdAt: Date
}
