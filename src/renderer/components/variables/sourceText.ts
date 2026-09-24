import type { ComponentsView } from "../../../document/components";
import type { DesignDocument } from "../../../document/document";
import type { Layer, LayerId } from "../../../document/layer";
import { layerPath, segmentsOf } from "../../../document/path";
import type { Found } from "../../../document/resolve";
import { ownerLabel } from "./VariablePicker";

export interface Source {
	text: string;
	layer: LayerId | null;
}

function copyPath(id: LayerId, copy: string): LayerId | null {
	const segments = segmentsOf(id);
	const at = segments.findIndex((segment) => segment === copy);
	const node = segments[at];
	return node === undefined ? null : layerPath(segments.slice(0, at), node);
}

function variableName(view: ComponentsView, id: string): string {
	return view.declared(id)?.variable.name ?? id;
}

export function traceAt(
	doc: DesignDocument,
	layer: Layer,
	variable: string,
	placement: boolean,
): Found | null {
	return doc.tree.trace(layer.id, variable, placement);
}

export function ownersAt(doc: DesignDocument, layer: Layer, placement: boolean): readonly string[] {
	return doc.tree.ownersAt(layer.id, placement);
}

export function sourceOf(
	doc: DesignDocument,
	view: ComponentsView,
	id: LayerId,
	found: Found,
): Source {
	const { origin, value } = found;
	const shown = String(value);
	if (origin.kind === "assigned") {
		const layer = copyPath(id, origin.copy);
		const name = layer === null ? "a copy" : (doc.layer(layer)?.name ?? "a copy");
		return { text: `${shown} · set on ${name}`, layer };
	}
	const scope = ownerLabel(view, origin.owner);
	if (origin.kind === "table") {
		return {
			text: `${shown} · from ${variableName(view, origin.choice)}: ${origin.option} · ${scope}`,
			layer: null,
		};
	}
	return { text: `${shown} · default · ${scope}`, layer: null };
}
