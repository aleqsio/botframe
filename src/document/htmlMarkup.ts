import { componentMarkup } from "./component";
import type { ComponentStore } from "./components";
import type { LayerContent } from "./layer";
import type { TemplateValue } from "./template";

export function htmlMarkupOf(store: ComponentStore, content: LayerContent): string | null {
	if (content.kind !== "component") {
		return null;
	}
	const body = store.entry(content.component)?.body;
	const component = body?.kind === "html" ? store.source(body.source) : null;
	if (component === null) {
		return null;
	}
	const values: Record<string, TemplateValue> = {};
	for (const variable of store.scope(content.component).variables()) {
		const value = content.values[variable.id];
		if (value !== undefined) {
			values[variable.name] = typeof value === "number" ? String(value) : value;
		}
	}
	return componentMarkup(component, values);
}
