import express from 'express';

const router = express.Router();

// Payment records must only be marked successful by the verified Stripe webhook.
// No client-callable endpoint is allowed to force payment completion.

export default router;
