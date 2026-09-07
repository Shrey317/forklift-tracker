/**
 * Maps Section 20's error codes to field-flow-appropriate messages.
 * Deliberately not verbatim server messages — these are written for
 * someone standing on the warehouse floor, not a developer.
 */
export function getFriendlyErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'VALIDATION_FAILED':
      return 'Please check the values you entered.';
    case 'INVALID_ROLE':
      return "You don't have permission to do this.";
    case 'CSRF_REJECTED':
      return 'Your session looks out of date. Please refresh the page and try again.';
    case 'NOT_FOUND':
      return "That record couldn't be found. It may have changed — try going back and starting again.";
    case 'FORKLIFT_NOT_AVAILABLE':
      return 'This forklift is not available for a new shift right now.';
    case 'SHIFT_ALREADY_ACTIVE':
      return 'This forklift already has a shift in progress.';
    case 'SHIFT_ALREADY_COMPLETED':
      return 'This shift has already been ended.';
    case 'FORKLIFT_HAS_ACTIVE_SHIFT':
      return 'This forklift still has an open shift.';
    case 'INVALID_READING':
      return "That reading doesn't look right — check it isn't lower than the last one recorded.";
    case 'RATE_LIMITED':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'INTERNAL_ERROR':
      return 'The system is temporarily unavailable. Your data has not been saved. Please try again.';
    default:
      return fallback;
  }
}
