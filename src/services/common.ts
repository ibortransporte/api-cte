import {
  InsertSyncJobDocument,
  InsertSyncJobMutation,
  InsertSyncJobMutationVariables,
} from '../@types/generated/types';
import { adminApolloClient } from '../utils/apollo';
import { errorParser, FluxuError } from '../utils/error';

// ----------------------------------------------------------------------

export const saveSyncJobs = async (data: {
  type: 'dexco-multitms-nfe';
  error: unknown;
  started_at: Date;
  ended_at: Date;
}): Promise<void> => {
  try {
    await adminApolloClient.mutate<
      InsertSyncJobMutation,
      InsertSyncJobMutationVariables
    >({
      mutation: InsertSyncJobDocument,
      variables: {
        data: {
          type: data.type,
          error: data.error ? JSON.stringify(errorParser(data.error)) : null,
          started_at: data.started_at,
          ended_at: data.ended_at,
          duration_ms: data.ended_at.getTime() - data.started_at.getTime(),
        },
      },
    });
  } catch (error) {
    throw new FluxuError({
      status: 500,
      message: '(saveSyncJobs) Could not save sync jobs.',
      error,
    });
  }
};
