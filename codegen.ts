import type { CodegenConfig } from '@graphql-codegen/cli';
import { ENV } from './src/env';

// ----------------------------------------------------------------------

const config: CodegenConfig = {
  schema: [
    {
      [ENV.HASURA_HTTPS]: {
        headers: {
          'x-hasura-admin-secret': ENV.HASURA_ADMIN_SECRET,
          'x-hasura-role': 'admin',
        },
      },
    },
  ],
  overwrite: true,
  ignoreNoDocuments: true,
  documents: ['src/**/*.graphql'],
  generates: {
    './src/@types/generated/types.ts': {
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
      config: {
        avoidOptionals: {
          field: true,
          inputValue: false,
        },
        defaultScalarType: 'unknown',
        scalars: {
          uuid: 'string',
          numeric: 'number',
          float8: 'number',
          smallint: 'number',
          interval: 'string',
          time: { input: 'Date | string', output: 'string' },
          timetz: { input: 'Date | string', output: 'string' },
          timestamp: { input: 'Date | string', output: 'string' },
          timestamptz: { input: 'Date | string', output: 'string' },
          date: { input: 'Date | string', output: 'string' },
          datetime: { input: 'Date | string', output: 'string' },
          datetimeoffset: { input: 'Date | string', output: 'string' },
        },
      },
    },
  },
};

export default config;
