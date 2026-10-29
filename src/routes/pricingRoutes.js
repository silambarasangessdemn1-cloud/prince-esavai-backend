import express from 'express';
import {
  getPricing,
  updatePricing,
  updateSingleServicePrice,
} from '../controllers/pricingController.js';

const router = express.Router();

router.get('/', getPricing);
router.post('/', updatePricing);
router.put('/', updatePricing);
router.patch('/service/:serviceId', updateSingleServicePrice);

export default router;

