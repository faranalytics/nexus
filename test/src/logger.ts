import { Logger, Formatter, ConsoleHandler, SyslogLevel, root} from "streams-logger";

const logger = new Logger({ level: SyslogLevel.DEBUG });
export const formatter = new Formatter<any, string>({
    format: ({ isotime, message, name, level, func, url, line, col }) => {
        return `${isotime}:${level}:${line}:${col}: ${typeof message == 'string' ? message : JSON.stringify(message)}\n`;
    },
});
export const consoleHandler = new ConsoleHandler<string>({ level: SyslogLevel.DEBUG });
export const log = logger.connect(formatter.connect(consoleHandler));