import { Router } from 'express';
import { search, getIcon, getIconBySlug } from '../controllers/iconController';

const router = Router();

router.get('/search', search);
router.get('/icon', getIcon);
router.get('/icon/:slug', getIconBySlug);

export default router;