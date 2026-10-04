import { listOf } from "../../document/bag";

export interface GoogleFamily {
	family: string;
	category: string;
	weights: readonly number[];
	italic: boolean;
	variable: boolean;
}

const CSS_API = "https://fonts.googleapis.com/css2";

function isNumbers(value: readonly unknown[]): value is readonly number[] {
	return value.length > 0 && value.every((item) => typeof item === "number");
}

function familyOf(value: unknown): GoogleFamily | null {
	const [family, category, weights, italic, variable] = listOf(value);
	const list = listOf(weights);
	if (typeof family !== "string" || typeof category !== "string" || !isNumbers(list)) {
		return null;
	}
	return { family, category, weights: list, italic: italic === 1, variable: variable === 1 };
}

let families: Promise<readonly GoogleFamily[]> | null = null;

export function googleFamilies(): Promise<readonly GoogleFamily[]> {
	families ??= import("./googleFonts.json").then((list) =>
		listOf(list.default).flatMap((entry) => familyOf(entry) ?? []),
	);
	return families;
}

export function nearestWeight(family: GoogleFamily, weight: number): number {
	if (family.variable) {
		const [low = weight, high = weight] = family.weights;
		return Math.min(Math.max(weight, low), high);
	}
	return family.weights.reduce((best, held) =>
		Math.abs(held - weight) < Math.abs(best - weight) ? held : best,
	);
}

export function cssUrl(family: GoogleFamily, italic: boolean, weight: number): string {
	const name = encodeURIComponent(family.family).replaceAll("%20", "+");
	const style = italic && family.italic ? 1 : 0;
	const [low, high] = family.weights;
	const weights = family.variable ? `${low}..${high}` : String(nearestWeight(family, weight));
	return `${CSS_API}?family=${name}:ital,wght@${style},${weights}`;
}
