// Lets services throw errors with an HTTP status,
// so controllers stay thin and just map errors to responses.
export class AppError extends Error {
    constructor(
      message: string,
      public readonly statusCode: number = 500
    ) {
      super(message);
      this.name = "AppError";
    }
  }