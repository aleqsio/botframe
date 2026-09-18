import type { Side, Spacing } from "../../../document/layout";

export type Sides = Record<Side, Spacing>;

export function spreadSides(value: Spacing): Sides {
	return { top: value, right: value, bottom: value, left: value };
}
