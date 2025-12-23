import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client/core';
import { ENV } from '../env';

// ----------------------------------------------------------------------

const getApolloClient = ({
  uri,
  headers,
}: {
  uri: string;
  headers?: Record<string, string>;
}) => {
  return new ApolloClient({
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { fetchPolicy: 'no-cache', errorPolicy: 'none' },
      query: { fetchPolicy: 'no-cache', errorPolicy: 'none' },
      mutate: { errorPolicy: 'none' },
    },
    link: new HttpLink({ uri: uri, headers }),
  });
};

const adminApolloClient = getApolloClient({
  uri: ENV.HASURA_HTTPS,
  headers: { 'x-hasura-admin-secret': ENV.HASURA_ADMIN_SECRET },
});

// ----------------------------------------------------------------------

export { getApolloClient, adminApolloClient };
