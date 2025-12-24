import { Router } from 'express';
import z from 'zod';
import { errorHandler, FluxuError } from '../../utils/error';
import { getNfsPendingCte } from './utils';

//

export const cteRoutes = Router();

// ----------------------------------------------------------------------

cteRoutes.post('/cte/list-nfs-pending-cte', async (req, res, next) => {
  try {
    const { authorization } = z
      .object({ authorization: z.string() })
      .parse(req.headers);

    if (authorization !== 'R3p6f7ShXasJW2epbum5IQDO') {
      throw new FluxuError({
        status: 401,
        message: 'Não autorizado.',
      });
    }

    const data = await getNfsPendingCte();

    res.status(200).json(data);
  } catch (error) {
    errorHandler({ error, origin: '/cte/list-nfs-pending-cte', res });
  }
  next();
});
