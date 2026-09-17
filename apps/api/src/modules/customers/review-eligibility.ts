export type ReviewModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const REFUND_REVIEW_KEEP_MIN_STARS = 4;

export type ReviewEligibility = {
  purchased: boolean;
  alreadyReviewed: boolean;
  reviewStatus: ReviewModerationStatus | null;
  eligible: boolean;
};

export type PurchaseLine = { quantity: number; returnedQty: number };

export function hasKeptPurchase(lines: PurchaseLine[]) {
  return lines.some((line) => line.quantity - line.returnedQty > 0);
}

/** After a refund/return, keep 4–5 star reviews; unpublish 1–3. */
export function shouldKeepReviewAfterRefund(rating: number) {
  return rating >= REFUND_REVIEW_KEEP_MIN_STARS;
}

export function buildReviewEligibility(
  purchased: boolean,
  reviewStatus: ReviewModerationStatus | null,
): ReviewEligibility {
  return {
    purchased,
    alreadyReviewed: Boolean(reviewStatus),
    reviewStatus,
    eligible: purchased && !reviewStatus,
  };
}
