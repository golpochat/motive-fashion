import { describe, expect, it } from 'vitest';
import {
  buildReviewEligibility,
  hasKeptPurchase,
  shouldKeepReviewAfterRefund,
} from '../src/modules/customers/review-eligibility';

describe('review eligibility', () => {
  it('blocks anyone who has not received or collected the piece', () => {
    expect(buildReviewEligibility(false, null)).toEqual({
      purchased: false,
      alreadyReviewed: false,
      reviewStatus: null,
      eligible: false,
    });
  });

  it('allows one review after delivery or collection', () => {
    expect(buildReviewEligibility(true, null).eligible).toBe(true);
  });

  it('does not allow a second review', () => {
    expect(buildReviewEligibility(true, 'PENDING').eligible).toBe(false);
    expect(buildReviewEligibility(true, 'APPROVED').eligible).toBe(false);
    expect(buildReviewEligibility(true, 'REJECTED').eligible).toBe(false);
  });

  it('treats a fully returned line as not kept', () => {
    expect(hasKeptPurchase([{ quantity: 1, returnedQty: 1 }])).toBe(false);
    expect(hasKeptPurchase([{ quantity: 2, returnedQty: 1 }])).toBe(true);
  });

  it('keeps refunded-item reviews at 4 stars and above', () => {
    expect(shouldKeepReviewAfterRefund(5)).toBe(true);
    expect(shouldKeepReviewAfterRefund(4)).toBe(true);
    expect(shouldKeepReviewAfterRefund(3)).toBe(false);
    expect(shouldKeepReviewAfterRefund(1)).toBe(false);
  });
});
