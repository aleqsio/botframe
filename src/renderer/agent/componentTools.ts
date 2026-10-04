import { componentSourceOf, sourceProblems } from "../../document/component";
import type { DesignDocument } from "../../document/document";
import { componentId } from "../componentImport";
import type { Args } from "./args";
import type { Handler } from "./layerTools";

async function createHtmlComponent(doc: DesignDocument, args: Args): Promise<unknown> {
	const given = {
		name: args["name"],
		html: args["html"],
		css: args["css"] ?? "",
		props: args["props"] ?? [],
	};
	const problems = sourceProblems(given);
	const source = componentSourceOf(given);
	if (problems.length > 0 || source === null) {
		throw new TypeError(`botframe cannot read the component: ${problems.join(", ")}.`);
	}
	const address = await componentId(source);
	doc.components.importHtml([[address, source]]);
	const entry = doc.components
		.entries()
		.find((held) => held.body.kind === "html" && held.name === source.name);
	if (entry === undefined) {
		throw new Error("botframe did not add the component.");
	}
	return {
		component: entry.id,
		source: address,
		props: doc.components.scope(entry.id).variables(),
	};
}

export const COMPONENT_TOOLS: Readonly<Record<string, Handler>> = {
	create_html_component: createHtmlComponent,
};
