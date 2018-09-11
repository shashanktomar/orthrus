// tslint:disable:max-classes-per-file

export class InvalidQueryError extends Error {
  public message: string
  constructor(msg: string) {
    super('INVALID_QUERY')
    this.name = this.constructor.name
    this.message = msg
  }
}

export class UniqueConstraintViolation extends Error {
  public message: string
  constructor(msg: string) {
    super('UNIQUE_CONSTRAINT_VIOLATION')
    this.name = this.constructor.name
    this.message = msg
  }
}
