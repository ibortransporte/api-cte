import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

// ----------------------------------------------------------------------

const envs = z
  .object({
    NODE_ENV: z.enum(['production']),
    TZ: z.enum(['America/Sao_Paulo']),
    //
    HASURA_HTTPS: z.string().nonempty(),
    HASURA_ADMIN_SECRET: z.string().nonempty(),
    //
    MSSQL_HOST: z.string().nonempty(),
    MSSQL_PORT: z.coerce.number(),
    MSSQL_USER: z.string().nonempty(),
    MSSQL_PASSWORD: z.string().nonempty(),
  })
  .parse(process.env);

export const ENV = envs;
