import type { Modifiers } from "./modifiers";

export interface StepRule {
	small: number;
	normal: number;
	large: number;
}

export const LENGTH_STEP: StepRule = { small: 0.1, normal: 1, large: 10 };
export const PERCENT_STEP: StepRule = { small: 0.1, normal: 1, large: 5 };
export const ANGLE_STEP: StepRule = { small: 0.1, normal: 1, large: 15 };
export const FACTOR_STEP: StepRule = { small: 0.01, normal: 0.05, large: 0.2 };
export const FRACTION_STEP: StepRule = { small: 0.05, normal: 0.1, large: 1 };
export const ANGLE_SNAP: StepRule = { small: 5, normal: 0, large: ANGLE_STEP.large };

export function stepOf(rule: StepRule, modifiers: Modifiers): number {
	if (modifiers.shift) {
		return rule.large;
	}
	return modifiers.alt ? rule.small : rule.normal;
}
