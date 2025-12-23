import { format } from 'date-fns';
import { FluxuError } from '../../utils/error';
import { saveSyncJobs } from '../common';
import { fetchData, getUsers, saveData } from './utils';

// ----------------------------------------------------------------------

export const syncDexcoNfes = async () => {
  // get users credentials
  const users = (await getUsers()).filter((item) =>
    ['17689-MG'].includes(item.usuario),
  );

  if (!users.length) {
    throw new FluxuError({
      status: 500,
      message: '(syncDexcoNfes) User not found.',
    });
  }

  const user = users[0];
  const jobInitAt = new Date();

  console.info(
    `\n\n[Fluxu] (/multitms/sync-dexco-nfe) Syncing started (${format(
      new Date(),
      'dd/MM/yyyy HH:mm:ss',
    )})...\n`,
  );

  try {
    // fetch new data
    const cargoData = await fetchData({ user });
    console.log(cargoData);

    if (!cargoData.length) {
      console.info(`[Fluxu] (/multitms/sync-dexco-nfe) No records to save...`);
      console.info('\n');
      await saveSyncJobs([
        {
          type: 'dexco',
          error: null,
          started_at: jobInitAt,
          ended_at: new Date(),
        },
      ]);
      return;
    }

    console.info(
      `[Fluxu] (/multitms/sync-dexco-nfe) Saving ${cargoData.length} records...`,
    );

    // save the data in chunks
    const chunkSize = 100;
    for (let i = 0; i < cargoData.length; i += chunkSize) {
      const chunk = cargoData.slice(i, i + chunkSize);
      await saveData({ data: chunk });
    }

    console.info('\n');

    await saveSyncJobs([
      {
        type: 'dexco',
        error: null,
        started_at: jobInitAt,
        ended_at: new Date(),
      },
    ]);
  } catch (error) {
    console.error(
      `[Fluxu] (/multitms/sync-dexco-nfe) Error syncing "${user.usuario}":`,
      error,
    );
    await saveSyncJobs([
      {
        type: 'dexco',
        error: new FluxuError({
          status: 500,
          message: `[Fluxu] (/multitms/sync-dexco-nfe) Error syncing "${user.usuario}":`,
          error,
        }),
        started_at: jobInitAt,
        ended_at: new Date(),
      },
    ]);
  }

  console.info('[Fluxu] (/multitms/sync-dexco-nfe) Syncing finished.');
};
