import { format, subDays } from 'date-fns';
import { chromium, devices } from 'playwright';
import {
  getClient_SQLServer,
  mssql,
  runQuery_SQLServer,
} from '../../utils/database';
import { dataParse } from '../../utils/dataParser';
import { FluxuError } from '../../utils/error';
import { apiBodyTemplateString } from './apiBodyTemplate';
import { adminApolloClient } from '../../utils/apollo';
import {
  InsertNfesDocument,
  InsertNfesMutationVariables,
  InsertNfesMutation,
} from '../../@types/generated/types';

// ----------------------------------------------------------------------

// não consegui encontrar:
// •⁠  ⁠CNPJ do consignatário
// •⁠  ⁠Código do produto
// •⁠  ⁠Embalagem/tipo
// •⁠  Quantidade de produto na NF

// tem NFs duplicadas no meio (dois pedidos)

// ----------------------------------------------------------------------

// dont sync previus dates
export const fromDateDefault = new Date('2025-12-15T00:00:00-03:00');

// ----------------------------------------------------------------------

type NfRawData = {
  NotasFiscais: string; // ⁠Nº da NF
  CNPJRemetente: string;
  CNPJDestinatario: string;
  ObservacaoPedido: string | null;
  EnderecoDestinatario: string;
  SerieNotaFiscal: string;
  DataNotaFiscal: string;
  Peso: string;
  ValorNFe: string;
  ChaveNFe: string;
};

export type NfData = {
  numero_nf: number;
  cnpj_remetente: string;
  cnpj_destinatario: string;
  observacao: string | null;
  endereco_destino: string;
  serie_nf: number;
  data_nf: Date;
  peso: number;
  valor_nf: number;
  chave_nf: string;
};

export type User = {
  usuario: string;
  senha: string;
  url: string;
};

// ----------------------------------------------------------------------

export const parseNfRawData = (data: NfRawData[]): NfData[] => {
  return data.map((item) => {
    return {
      numero_nf: dataParse.float(item['NotasFiscais']) as number,
      cnpj_remetente: dataParse.string(item['CNPJRemetente']) as string,
      cnpj_destinatario: dataParse.string(item['CNPJDestinatario']) as string,
      observacao: dataParse.string(item['ObservacaoPedido']) as string,
      endereco_destino: dataParse.string(
        item['EnderecoDestinatario'],
      ) as string,
      serie_nf: dataParse.float(item['SerieNotaFiscal']) as number,
      data_nf: dataParse.date(item['DataNotaFiscal']) as Date,
      peso: dataParse.float(item['Peso']) as number,
      valor_nf: dataParse.float(item['ValorNFe']) as number,
      chave_nf: dataParse.string(item['ChaveNFe']) as string,
    };
  });
};

// ----------------------------------------------------------------------

export const getUsers = async (): Promise<User[]> => {
  try {
    const { rows: usersResult } = await runQuery_SQLServer<{
      usuario: string;
      senha: string;
      url: string;
    }>({
      query: `
          SELECT * FROM INTEGRATION.multitms.usuario
        `,
    });

    return usersResult;
  } catch (error) {
    throw new FluxuError({
      status: 500,
      message: '(getUsers) Não foi possível buscar os usuários.',
      error,
    });
  }
};

// ----------------------------------------------------------------------

export const fetchData = async ({
  user,
}: {
  user: User;
}): Promise<NfData[]> => {
  const browser = await chromium.launch({
    headless: true,
    timeout: 60000,
    args: ['--no-sandbox', '--shm-size=1gb'],
  });

  try {
    // setup browser
    const context = await browser.newContext({
      ...devices['Desktop Chrome'],
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
    });
    const page = await context.newPage();
    await context.route('**/*.{png,jpg,jpeg}', (route) => route.abort());

    // navigate to login page
    await page.goto(user.url, { timeout: 30000 });

    await page.waitForTimeout(1000);

    // sign in
    await page.fill('#Usuario', user.usuario);
    await page.fill('#Senha', user.senha);
    await page.click('button:has-text("Acessar")');

    // get cookies
    const cookies = await context.cookies();
    const cookie = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ');

    await context.close();
    await browser.close();

    //

    // prepare url
    const baseUrl =
      'https://decamadeira.multitransportador.com.br/Relatorios/NFes/Pesquisa';
    const urlParams =
      '?callback=jQuery' + Math.floor(Math.random() * 1e16) + '_' + Date.now();
    const url = baseUrl + urlParams;

    const replaceDate = ({
      urlEncodedString,
      startDate,
      endDate,
    }: {
      urlEncodedString: string;
      startDate: Date;
      endDate: Date;
    }) => {
      const encode = (date: Date) =>
        encodeURIComponent(
          user.url.includes('decamadeira')
            ? format(date, 'dd/MM/yyyy')
            : format(date, 'dd/MM/yyyy HH:mm'),
        ).replace(/%20/g, '+');
      return urlEncodedString.replace(
        /DataInicialEmissao=[^&]+&DataFinalEmissao=[^&]+/,
        `DataInicialEmissao=${encode(startDate)}&DataFinalEmissao=${encode(endDate)}`,
      );
    };

    const replacePagination = ({
      urlEncodedString,
      start,
      length,
    }: {
      urlEncodedString: string;
      start: number;
      length: number;
    }) => {
      return urlEncodedString.replace(
        /%22start%22%3A\d+%2C%22length%22%3A\d+/,
        `%22start%22%3A${start}%2C%22length%22%3A${length}`,
      );
    };

    //

    const fromDate =
      subDays(new Date(), 7) <= fromDateDefault
        ? fromDateDefault
        : subDays(new Date(), 7);

    let parsed: NfData[] = [];
    // replace date
    let body = replaceDate({
      urlEncodedString: apiBodyTemplateString,
      startDate: fromDate,
      endDate: new Date(),
    });

    const pageSize = 250;
    for (let start = 0; pageSize !== null; start += pageSize) {
      // set pagination
      body = replacePagination({
        urlEncodedString: body,
        start: start,
        length: pageSize,
      });

      // fetch data
      const response = await fetch(url, {
        method: 'POST',
        body,
        headers: {
          cookie,
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
      }).then((res) => res.text());
      // parse jQuery callback return
      const jsonStr = response.replace(/^.*?\(/, '').replace(/\);?$/, '');
      const data = JSON.parse(jsonStr) as {
        Data: { data: NfRawData[]; recordsTotal: number };
      };
      const recordsCount = data.Data.recordsTotal;
      const newParsed = parseNfRawData(data.Data.data);

      // append data to main array
      parsed = [...parsed, ...newParsed];

      // check if there's more data
      if (start + pageSize >= recordsCount) break;
    }

    return parsed;
  } catch (error) {
    await browser.close();
    throw new FluxuError({
      status: 500,
      message: '(fetchData) Não foi possível exportar as cargas.',
      error,
    });
  }
};

// ----------------------------------------------------------------------

export const saveData = async ({
  data: _data,
}: {
  data: NfData[];
}): Promise<void> => {
  try {
    const request = (await getClient_SQLServer()).request();

    // remove duplicates
    const data = Array.from(
      new Map(_data.map((item) => [item.numero_nf, item])).values(),
    );

    await adminApolloClient.mutate<
      InsertNfesMutation,
      InsertNfesMutationVariables
    >({
      mutation: InsertNfesDocument,
      variables: {
        data: data.map((item) => ({
          numero_nf: item.numero_nf,
          cnpj_remetente: item.cnpj_remetente,
          cnpj_destinatario: item.cnpj_destinatario,
          observacao: item.observacao,
          endereco_destino: item.endereco_destino,
          serie_nf: item.serie_nf,
          data_nf: item.data_nf,
          peso: item.peso,
          valor_nf: item.valor_nf,
          chave_nf: item.chave_nf,
        })),
      },
    });

    const rows = data
      .map((item, i) => {
        const prefix = `p${i}`;
        request.input(`${prefix}_numero_nf`, mssql.Int, item.numero_nf);
        request.input(
          `${prefix}_cnpj_remetente`,
          mssql.NVarChar,
          item.cnpj_remetente,
        );
        request.input(
          `${prefix}_cnpj_destinatario`,
          mssql.NVarChar,
          item.cnpj_destinatario,
        );
        request.input(`${prefix}_observacao`, mssql.NVarChar, item.observacao);
        request.input(
          `${prefix}_endereco_destino`,
          mssql.NVarChar,
          item.endereco_destino,
        );
        request.input(`${prefix}_serie_nf`, mssql.Int, item.serie_nf);
        request.input(`${prefix}_data_nf`, mssql.DateTime, item.data_nf);
        request.input(`${prefix}_peso`, mssql.Decimal, item.peso);
        request.input(`${prefix}_valor_nf`, mssql.Decimal, item.valor_nf);
        request.input(`${prefix}_chave_nf`, mssql.NVarChar, item.chave_nf);

        return `
          SELECT
            @${prefix}_numero_nf,
            @${prefix}_cnpj_remetente,
            @${prefix}_cnpj_destinatario,
            @${prefix}_observacao,
            @${prefix}_endereco_destino,
            @${prefix}_serie_nf,
            @${prefix}_data_nf,
            @${prefix}_peso,
            @${prefix}_valor_nf,
            @${prefix}_chave_nf
        `;
      })
      .join(' UNION ALL ');

    const query = `
      WITH source (
        numero_nf, 
        cnpj_remetente, 
        cnpj_destinatario, 
        observacao, 
        endereco_destino, 
        serie_nf, 
        data_nf, 
        peso,
        valor_nf,
        chave_nf
      ) AS (
        ${rows}
      )
      MERGE INTEGRATION.nfe_sync.nfe AS target  
      USING source
      ON target.numero_nf = source.numero_nf
      WHEN MATCHED THEN
        UPDATE SET
          numero_nf = source.numero_nf,
          cnpj_remetente = source.cnpj_remetente,
          cnpj_destinatario = source.cnpj_destinatario,
          observacao = source.observacao,
          endereco_destino = source.endereco_destino,
          serie_nf = source.serie_nf,
          data_nf = source.data_nf,
          peso = source.peso,
          valor_nf = source.valor_nf,
          chave_nf = source.chave_nf
      WHEN NOT MATCHED THEN
        INSERT (
          numero_nf, 
          cnpj_remetente, 
          cnpj_destinatario, 
          observacao, 
          endereco_destino, 
          serie_nf, 
          data_nf, 
          peso,
          valor_nf,
          chave_nf
        )
        VALUES (
          source.numero_nf,
          source.cnpj_remetente,
          source.cnpj_destinatario,
          source.observacao,
          source.endereco_destino,
          source.serie_nf,
          source.data_nf,
          source.peso,
          source.valor_nf,
          source.chave_nf
        );
    `;

    await request.query(query);
  } catch (error) {
    throw new FluxuError({
      status: 500,
      message: '(saveData) Não foi possível salvar os dados.',
      error,
    });
  }
};
