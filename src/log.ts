/** The project's logging facility; there is no backend, so errors go to the console. */
export function logError(message: string, cause: unknown): void {
  console.error(message, cause);
}
