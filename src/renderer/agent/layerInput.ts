import { bagOf, listOf } from "../../document/bag";
import type { DesignDocument } from "../../document/document";
import type { Variable } from "../../document/variable";
import { DOCUMENT_SCOPE } from "../../document/variable";
import type { Args } from "./args";

const FRAME = { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: true };

function findVariable(scopes: readonly (readonly Variable[])[], key: string): Variable | undefined {
	const all = scopes.flat();
	return (
		all.find((variable) => variable.id === key) ?? all.find((variable) => variable.name === key)
	);
}

function propIds(doc: DesignDocument, component: string, props: Args): Args {
	const scopes = [
		doc.components.scope(component).variables(),
		doc.components.scope(DOCUMENT_SCOPE).variables(),
	];
	const unknown = Object.keys(props).filter((key) => findVariable(scopes, key) === undefined);
	if (unknown.length > 0) {
		const names = scopes[0]?.map((variable) => variable.name).join(", ") ?? "";
		throw new TypeError(`The component has no prop ${unknown.join(", ")}. Its props: ${names}.`);
	}
	return Object.fromEntries(
		Object.entries(props).map(([key, value]) => [findVariable(scopes, key)?.id ?? key, value]),
	);
}

function contentOf(doc: DesignDocument, content: unknown, held: string | null): unknown {
	const bag = bagOf(content);
	if (bag["props"] === undefined) {
		return content;
	}
	const component = typeof bag["component"] === "string" ? bag["component"] : held;
	if (component === null) {
		throw new TypeError("Give content.component with content.props.");
	}
	return { ...bag, props: propIds(doc, component, bagOf(bag["props"])) };
}

export function layerInput(doc: DesignDocument, layer: unknown, held: string | null): Args {
	const bag = bagOf(layer);
	const children = listOf(bag["children"]);
	return {
		...bag,
		...(bag["content"] === undefined ? {} : { content: contentOf(doc, bag["content"], held) }),
		...(children.length > 0 && bag["geometry"] === undefined ? { geometry: FRAME } : {}),
		...(bag["children"] === undefined
			? {}
			: { children: children.map((child) => layerInput(doc, child, null)) }),
	};
}
