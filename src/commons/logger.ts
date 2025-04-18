import {
  Logger,
  Formatter,
  ConsoleHandler,
  SyslogLevel,
} from "streams-logger";
export {
  SyslogLevel
};
export const logger = new Logger<unknown>({ level: SyslogLevel.INFO });
export const formatter = new Formatter<unknown, string>({
  format: ({ isotime, level, label, message }) => {
    return `${isotime ?? ""}:${level}:${label ?? ""}: ${typeof message == "string" ? message : JSON.stringify(message)}\n`;
  },
});
export const consoleHandler = new ConsoleHandler<string>({ level: SyslogLevel.DEBUG });
export const log = logger.connect(
  formatter.connect(consoleHandler)
);