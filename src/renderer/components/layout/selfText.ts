import type { LayerLayout, Placement, Span } from "../../../document/layout";

const CONTEXT: Readonly<Record<LayerLayout["display"], string>> = {
	block: "in Block",
	row: "in Flex row",
	column: "in Flex column",
	grid: "in Grid",
};

const WRAP_SUFFIX = " · wrap";
const AUTO_PLACEMENT = "auto placement, layer order decides the cell";

export function isFlex(display: LayerLayout["display"]): boolean {
	return display === "row" || display === "column";
}

export function contextText(parent: LayerLayout | null): string {
	if (parent === null) {
		return CONTEXT.block;
	}
	const wrapped = parent.wrap && isFlex(parent.display);
	return CONTEXT[parent.display] + (wrapped ? WRAP_SUFFIX : "");
}

function spanText(name: string, span: Span): string {
	return span.end === span.start + 1
		? `${name} ${span.start}`
		: `${name} ${span.start} to ${span.end}`;
}

export function placementText(cell: Placement): string {
	if (cell.mode === "auto") {
		return AUTO_PLACEMENT;
	}
	return `${spanText("column", cell.column)}, ${spanText("row", cell.row)}`;
}

export const PERCENT_TIP = "Resolves against the parent's width, even for top and bottom.";
