import { getClient_SQLServer, mssql } from '../utils/database';
import { errorParser, FluxuError } from '../utils/error';

// ----------------------------------------------------------------------

export const saveSyncJobs = async (data: {
  type: 'dexco-multitms-nfe';
  error: unknown;
  started_at: Date;
  ended_at: Date;
}): Promise<void> => {
  try {
    // await adminApolloClient.mutate<
    //   InsertSyncJobMutation,
    //   InsertSyncJobMutationVariables
    // >({
    //   mutation: InsertSyncJobDocument,
    //   variables: {
    //     data: {
    //       type: data.type,
    //       error: data.error ? JSON.stringify(errorParser(data.error)) : null,
    //       started_at: data.started_at,
    //       ended_at: data.ended_at,
    //       duration_ms: data.ended_at.getTime() - data.started_at.getTime(),
    //     },
    //   },
    // });

    //

    const request = (await getClient_SQLServer()).request();

    const rows = [data]
      .map((item, i) => {
        const prefix = `p${i}`;
        request.input(`${prefix}_type`, mssql.NVarChar, item.type);
        request.input(
          `${prefix}_error`,
          mssql.NVarChar,
          item.error ? JSON.stringify(errorParser(item.error)) : null,
        );
        request.input(`${prefix}_started_at`, mssql.DateTime, item.started_at);
        request.input(`${prefix}_ended_at`, mssql.DateTime, item.ended_at);
        request.input(
          `${prefix}_duration_ms`,
          mssql.Float,
          item.ended_at.getTime() - item.started_at.getTime(),
        );

        return `(
          @${prefix}_type,
          @${prefix}_error,
          @${prefix}_started_at,
          @${prefix}_ended_at,
          @${prefix}_duration_ms
        )`;
      })
      .join(', ');

    const query = `
      INSERT INTO INTEGRATION.new_cargos.sync_job (type, error, started_at, ended_at, duration_ms)
      VALUES ${rows}
    `;

    await request.query(query);
  } catch (error) {
    throw new FluxuError({
      status: 500,
      message: '(saveSyncJobs) Could not save sync jobs.',
      error,
    });
  }
};
