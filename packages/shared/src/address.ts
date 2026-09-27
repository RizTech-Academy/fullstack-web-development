export interface AddressInput {
  label?: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  pincode: string;
}

export interface SavedAddress extends AddressInput {
  id: string;
  isDefault: boolean;
}

/**
 * Indian pincodes are six digits and never start with zero.
 *
 * Validating the shape is not the same as validating that the address exists.
 * This catches a typo; it does not catch a real pincode 400km away, which is
 * what DELIVERY_PINCODES is for.
 */
export const PINCODE_PATTERN = /^[1-9][0-9]{5}$/;

/** Ten digits, optionally with +91 or a leading zero. Stored as ten digits. */
export function normalisePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const ten = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9][0-9]{9}$/.test(ten) ? ten : null;
}
