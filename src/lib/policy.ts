import { Order, OrderStatus } from "./orders";
import { RETURN_WINDOW_DAYS } from "./orders";

/**
 * Calculate shipping fee based on order subtotal.
 * Returns 0 for free shipping, 50 for charge, or null when the subtotal is exactly the boundary (₹499).
 */
export function calculateShippingFee(subtotal: number): number | null {
  if (subtotal > 499) return 0;
  if (subtotal < 499) return 50;
  // Boundary case – policy unclear
  return null;
}

/**
 * Check eligibility for a standard return.
 * Returns an object describing eligibility and an optional reason.
 */
export function checkReturnEligibility(order: Order, requestDate: Date = new Date()) {
  if (order.status !== "Delivered") {
    return { eligible: false, reason: "Order not delivered yet" } as const;
  }
  if (order.deliveredDaysAgo === undefined) {
    return { eligible: false, reason: "Delivery date unknown" } as const;
  }
  if (order.deliveredDaysAgo <= RETURN_WINDOW_DAYS) {
    return { eligible: true } as const;
  }
  return { eligible: false, reason: `Return window of ${RETURN_WINDOW_DAYS} days expired` } as const;
}

/**
 * Check eligibility for a damaged/defective product replacement.
 * Requires the report to be within 48 hours (≈2 days) of delivery and photos to be provided.
 */
export function checkDamagedProductEligibility(
  order: Order,
  reportDate: Date = new Date(),
  photosProvided: boolean = false,
) {
  if (order.status !== "Delivered") {
    return { eligible: false, reason: "Order not delivered yet" } as const;
  }
  if (order.deliveredDaysAgo === undefined) {
    return { eligible: false, reason: "Delivery date unknown" } as const;
  }
  // Approximate 48‑hour window using days: 2 days or less.
  if (order.deliveredDaysAgo <= 2 && photosProvided) {
    return { eligible: true } as const;
  }
  return { eligible: false, reason: "Report window (48 hours) expired or photos missing" } as const;
}

/**
 * Determine if an order can be cancelled based on its current status.
 */
export function checkCancellationEligibility(status: OrderStatus): boolean {
  return status === "Processing";
}

/**
 * Determine if an order qualifies for Cash on Delivery (COD).
 */
export function checkCODEligibility(orderTotal: number): boolean {
  return orderTotal <= 2500;
}

/** Helper to format Indian rupee amounts */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}
