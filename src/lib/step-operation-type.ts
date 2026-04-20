/** Operation type constants matching the Cecotec API values */
export const OPERATION_TYPES = {
  MANUAL: 0,
  PREPARATION: 1,
  COOKING: 2,
} as const;

export type OperationType = (typeof OPERATION_TYPES)[keyof typeof OPERATION_TYPES];

const LABELS: Record<number, string> = {
  [OPERATION_TYPES.MANUAL]: "Manual",
  [OPERATION_TYPES.PREPARATION]: "Preparation",
  [OPERATION_TYPES.COOKING]: "Cooking",
};

const BADGE_CLASSES: Record<number, string> = {
  [OPERATION_TYPES.MANUAL]: "badge-neutral",
  [OPERATION_TYPES.PREPARATION]: "badge-info",
  [OPERATION_TYPES.COOKING]: "badge-warning",
};

export function getStepTypeLabel(operationType: number): string {
  return LABELS[operationType] ?? "Manual";
}

export function getStepTypeBadgeClass(operationType: number): string {
  return BADGE_CLASSES[operationType] ?? "badge-neutral";
}
