// Wraps a promise with a hard deadline. Used at the top of each analysis API
// route so a slow/hanging external API never lets a serverless function run
// until the platform kills it with an opaque timeout — GitPulse detects the
// timeout itself first and returns a clear ANALYSIS_TIMEOUT error instead.

export class TimeoutError extends Error {
  constructor(message = "Operation timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
