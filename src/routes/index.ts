import { Router } from 'express';
import { cteRoutes } from './cte';

// ----------------------------------------------------------------------

export const routes = Router();

//

routes.use(cteRoutes);
