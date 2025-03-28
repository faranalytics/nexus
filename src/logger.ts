import {
    Logger,
    Formatter,
    ConsoleHandler,
    SyslogLevel,
} from "streams-logger";

export const logger = new Logger<any>({ level: SyslogLevel.DEBUG });
export const formatter = new Formatter<any, string>({
    format: ({ isotime, level, pathname, func, message }) => {
        return `${isotime}:${level}:${pathname}:${func}: ${typeof message == 'string' ? message : JSON.stringify(message)}\n`;
    },
});
export const consoleHandler = new ConsoleHandler<string>({ level: SyslogLevel.DEBUG });
export const log = logger.connect(
    formatter.connect(consoleHandler)
);