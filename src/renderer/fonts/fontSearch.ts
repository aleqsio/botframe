import type { GoogleFamily } from "./googleFonts";

const SHOWN = 60;
const WEIGHT_STEP = 100;

export function matchingFamilies(
	families: readonly GoogleFamily[],
	query: string,
): readonly GoogleFamily[] {
	const wanted = query.trim().toLowerCase();
	const rank = (family: GoogleFamily): number => {
		const name = family.family.toLowerCase();
		if (name === wanted) {
			return 0;
		}
		return name.startsWith(wanted) ? 1 : 2;
	};
	return families
		.filter((held) => held.family.toLowerCase().includes(wanted))
		.toSorted((one, two) => rank(one) - rank(two))
		.slice(0, SHOWN);
}

export function weightChoices(family: GoogleFamily | undefined): readonly number[] {
	if (family === undefined) {
		return [400, 700];
	}
	if (!family.variable) {
		return family.weights;
	}
	const [low = 400, high = 400] = family.weights;
	const first = Math.ceil(low / WEIGHT_STEP) * WEIGHT_STEP;
	const count = Math.floor((high - first) / WEIGHT_STEP) + 1;
	return Array.from({ length: count }, (_, index) => first + index * WEIGHT_STEP);
}
