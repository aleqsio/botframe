import { roundNumber } from "../../document/length";

export type Bound =
	| { kind: "clamp"; min: number; max: number }
	| { kind: "wrap"; min: number; max: number };

export interface NumberDrag {
	start: number;
	moved: number;
	step: number;
	bound: Bound;
}

const UNIT = /[%°\s]/gu;

export function numberIn(text: string): number | null {
	const digits = text.replace(UNIT, "");
	const value = digits === "" ? Number.NaN : Number(digits);
	return Number.isFinite(value) ? value : null;
}

export function formatNumber(value: number): string {
	return String(roundNumber(value));
}

export function boundValue(bound: Bound, value: number): number {
	if (bound.kind === "clamp") {
		return Math.min(Math.max(value, bound.min), bound.max);
	}
	const span = bound.max - bound.min;
	return bound.min + ((((value - bound.min) % span) + span) % span);
}

export function draggedValue(drag: NumberDrag): number {
	return boundValue(drag.bound, roundNumber(drag.start + drag.moved * drag.step));
}
