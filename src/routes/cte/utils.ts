import { NfData } from '../../services/sync-dexco-nfe/utils';
import { runQuery_SQLServer } from '../../utils/database';
import { FluxuError } from '../../utils/error';

// ----------------------------------------------------------------------

export const getNfsPendingCte = async (): Promise<NfData[]> => {
  try {
    const { rows: usersResult } = await runQuery_SQLServer<{
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
    }>({
      query: `
          SELECT
              nfe.numero_nf,
              nfe.cnpj_remetente,
              nfe.cnpj_destinatario,
              nfe.observacao,
              nfe.endereco_destino,
              nfe.serie_nf,
              nfe.data_nf,
              nfe.peso,
              nfe.valor_nf,
              nfe.chave_nf
          FROM INTEGRATION.nfe_sync.nfe nfe
          LEFT JOIN PROTHEUS..DTC010 dtc ON TRY_CAST(dtc.DTC_NUMNFC AS INT) = nfe.numero_nf
          WHERE D_E_L_E_T_ <> '*'
          AND DTC_DOC LIKE '% %'
          -- AND DTC_DOC = '         '
      `,
    });

    return usersResult;
  } catch (error) {
    throw new FluxuError({
      status: 500,
      message: '(getNfsPendingCte) Could not get nfs.',
      error,
    });
  }
};
