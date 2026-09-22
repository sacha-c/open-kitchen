import * as m from "$lib/paraglide/messages";

/** Operation type constants matching the Cecotec API values */
export const OPERATION_TYPES = {
  MANUAL: 0,
  PREPARATION: 1,
  COOKING: 2,
} as const;

export type OperationType =
  (typeof OPERATION_TYPES)[keyof typeof OPERATION_TYPES];

const BADGE_CLASSES: Record<number, string> = {
  [OPERATION_TYPES.MANUAL]: "badge-neutral",
  [OPERATION_TYPES.PREPARATION]: "badge-info",
  [OPERATION_TYPES.COOKING]: "badge-warning",
};

export function getStepTypeLabel(operationType: number): string {
  if (operationType === OPERATION_TYPES.PREPARATION) return m.step_type_preparation();
  if (operationType === OPERATION_TYPES.COOKING) return m.step_type_cooking();
  return m.step_type_manual();
}

export function getStepTypeBadgeClass(operationType: number): string {
  return BADGE_CLASSES[operationType] ?? "badge-neutral";
}
