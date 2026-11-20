// Creates an Error that carries an HTTP status code (read by errorMiddleware).
export function httpError(statusCode, message) {
    return Object.assign(new Error(message), { statusCode });
}
