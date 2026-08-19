import pg from "pg";
import { env } from "../config/env.js";

// DATE columns default to JS Date objects parsed in local time, which then
// shift a day when serialized to UTC ISO strings outside UTC+0. These are
// date-only values with no time component — keep them as plain "YYYY-MM-DD"
// strings all the way through.
const PG_TYPE_DATE = 1082;
pg.types.setTypeParser(PG_TYPE_DATE, (value: string) => value);

export const pool = new pg.Pool({ connectionString: env.databaseUrl });
