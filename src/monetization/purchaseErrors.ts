/** RevenueCat / store purchase error — safe to use on all platforms. */
export type ParsedPurchaseError = {
  userCancelled: boolean;
  message: string;
};

type PurchaseErrorLike = {
  userCancelled?: boolean;
  code?: string | number;
  message?: string;
};

const CANCELLED_CODES = new Set([
  'PURCHASE_CANCELLED_ERROR',
  'PurchaseCancelledError',
  1,
]);

/**
 * Normalizes RevenueCat purchase/restore failures for UI handling.
 * User cancellations return `userCancelled: true` with an empty message.
 */
export function parsePurchaseError(error: unknown): ParsedPurchaseError {
  if (!error || typeof error !== 'object') {
    return {
      userCancelled: false,
      message: 'Something went wrong. Please try again.',
    };
  }

  const e = error as PurchaseErrorLike;
  const userCancelled =
    e.userCancelled === true ||
    (e.code !== undefined && CANCELLED_CODES.has(e.code));

  if (userCancelled) {
    return { userCancelled: true, message: '' };
  }

  const raw = e.message?.trim();
  if (raw) {
    return { userCancelled: false, message: raw };
  }

  return {
    userCancelled: false,
    message: 'Something went wrong. Please try again.',
  };
}
