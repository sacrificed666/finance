type LogContext = Record<string, unknown>;

// The app name, with the environment unless it is production
const prefix = (): string => {
  const environment = process.env.APP_ENV;
  return environment && environment !== "production" ? `[finance ${environment}]` : "[finance]";
};

// A log line with the app name and the context as JSON
const line = (message: string, context?: LogContext): string =>
  context ? `${prefix()} ${message} ${JSON.stringify(context)}` : `${prefix()} ${message}`;

// Server logs that are easy to find among other output
export const log = {
  info(message: string, context?: LogContext): void {
    console.info(line(message, context));
  },
  warn(message: string, context?: LogContext): void {
    console.warn(line(message, context));
  },
  error(message: string, context?: LogContext): void {
    console.error(line(message, context));
  },
};
