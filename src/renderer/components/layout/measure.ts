import { parseUnitText } from "../../../document/length";
import type { MARGIN_UNITS, MarginSide } from "../../../document/layout";
import { FRACTION_STEP, LENGTH_STEP, PERCENT_STEP } from "../../input/step";
import type { StepRule } from "../../input/step";

export type MarginUnit = (typeof MARGIN_UNITS)[number];

export interface Measure<U extends string> {
	value: number;
	unit: U;
}

const AUTO = "auto";

export function marginMeasure(side: MarginSide): Measure<MarginUnit> {
	return side.unit === AUTO ? { value: 0, unit: AUTO } : side;
}

export function marginSideOf({ unit, value }: Measure<MarginUnit>): MarginSide {
	return unit === AUTO ? { unit } : { value, unit };
}

export function parseMeasure<U extends string>(
	text: string,
	units: readonly U[],
	fallback: U,
): Measure<U> | null {
	const auto = units.find((unit) => unit === AUTO);
	if (auto !== undefined && text.trim().toLowerCase() === AUTO) {
		return { value: 0, unit: auto };
	}
	return parseUnitText(text, units, fallback);
}

export function measureText({ unit, value }: Measure<string>): string {
	return unit === AUTO ? AUTO : String(value);
}

const UNIT_STEP: Readonly<Record<string, StepRule>> = {
	px: LENGTH_STEP,
	rem: LENGTH_STEP,
	"%": PERCENT_STEP,
	fr: FRACTION_STEP,
};

export function unitStep(unit: string): StepRule {
	return UNIT_STEP[unit] ?? LENGTH_STEP;
}
