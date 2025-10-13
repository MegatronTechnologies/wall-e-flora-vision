const isProduction = import.meta.env.PROD;

type LogLevel = "info" | "warn" | "error" | "debug";

const formatMessage = (scope: string | undefined, message: unknown) => {
  const prefix = scope ? `[${scope}]` : "[App]";
  return `${prefix} ${message}`;
};

const output = (level: LogLevel, scope: string | undefined, message: unknown, ...args: unknown[]) => {
  if (isProduction && level === "debug") {
    return;
  }

  const formatted = formatMessage(scope, message);

  switch (level) {
    case "warn":
      console.warn(formatted, ...args);
      break;
    case "error":
      console.error(formatted, ...args);
      break;
    case "debug":
      console.debug(formatted, ...args);
      break;
    default:
      console.log(formatted, ...args);
  }
};

export const logger = {
  info: (scope: string | undefined, message: unknown, ...args: unknown[]) => output("info", scope, message, ...args),
  warn: (scope: string | undefined, message: unknown, ...args: unknown[]) => output("warn", scope, message, ...args),
  error: (scope: string | undefined, message: unknown, ...args: unknown[]) => output("error", scope, message, ...args),
  debug: (scope: string | undefined, message: unknown, ...args: unknown[]) => output("debug", scope, message, ...args),
};

