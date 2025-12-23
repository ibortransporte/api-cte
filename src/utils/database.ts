import mssql from 'mssql';
import { FluxuError } from './error';
import { ENV } from '../env';

// ----------------------------------------------------------------------

export { mssql };

// ----------------------------------------------------------------------

export type Client_SQLServer = mssql.ConnectionPool;

export const getClient_SQLServer = async (): Promise<Client_SQLServer> => {
  const connection = new mssql.ConnectionPool({
    server: ENV.MSSQL_HOST,
    authentication: {
      type: 'default',
      options: {
        userName: ENV.MSSQL_USER,
        password: ENV.MSSQL_PASSWORD,
      },
    },
    options: {
      port: ENV.MSSQL_PORT,
      trustServerCertificate: true,
    },
  });
  const client = await connection.connect().catch((error) => {
    console.error('[Fluxu] SQL Server connection error: ', error);
    throw new FluxuError({
      status: 500,
      message: 'Erro de conexão ao banco de dados.',
      error,
    });
  });
  return client;
};

//

export async function runQuery_SQLServer<T extends Record<string, unknown>>({
  query,
}: {
  query: string;
}): Promise<{ rows: T[] }> {
  const client = await getClient_SQLServer();
  const request = new mssql.Request(client);
  const result = await request.query(query).catch((error) => {
    console.error('[Fluxu] SQL Server request error: ', error);
    throw new FluxuError({
      status: 500,
      message: 'A consulta retornou um erro.',
      error,
    });
  });
  if (result.recordsets.length) {
    return { rows: result.recordset as T[] };
  }
  return { rows: [] };
}
