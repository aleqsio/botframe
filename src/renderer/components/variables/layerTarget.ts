import { BINDING_TYPES, isPlacementBinding } from "../../../document/bindings";
import type { BindingKey } from "../../../document/bindings";
import type { DesignDocument } from "../../../document/document";
import type { Layer, LayerPatch } from "../../../document/layer";
import { isLiteral } from "../../../document/value";
import type { Literal } from "../../../document/value";
import { DOCUMENT_SCOPE } from "../../../document/variable";
import { useComponentsView } from "../../useDocument";
import { innerFirst, ownerLabel } from "./reach";
import { makeVariable } from "./scopeEdit";
import type { EditTarget, MakeAction } from "./target";

export interface FieldSpec {
	key: BindingKey;
	label: string;
	plain: (value: Literal) => LayerPatch | null;
}

function currentOf(layer: Layer, key: BindingKey): Literal {
	if (key === "cornerRadius" || key === "cornerSmoothing") {
		return layer.geometry.kind === "rectangle" ? layer.geometry[key] : 0;
	}
	return layer[key];
}

function makeAction(
	doc: DesignDocument,
	target: Pick<EditTarget, "reach" | "label" | "type" | "current">,
): MakeAction {
	const { current, label, reach, type } = target;
	const [owner = DOCUMENT_SCOPE] = innerFirst(reach.owners);
	return {
		label:
			owner === DOCUMENT_SCOPE
				? "Make a document variable"
				: `Make a prop of ${ownerLabel(reach.view, owner)}`,
		name: label.toLowerCase(),
		run: (name) => makeVariable(doc, owner, { name, type, initial: current, options: [] }),
	};
}

function patchOf(spec: FieldSpec, next: EditTarget["value"]): LayerPatch | null {
	if (!isLiteral(next)) {
		return { bindings: { [spec.key]: next } };
	}
	const literal = spec.plain(next);
	return literal === null ? null : { ...literal, bindings: { [spec.key]: null } };
}

export function useLayerTarget(doc: DesignDocument, layer: Layer, spec: FieldSpec): EditTarget {
	const { key, label } = spec;
	const view = useComponentsView(doc);
	const reach = { view, owners: doc.tree.ownersAt(layer.id, isPlacementBinding(key)) };
	const type = BINDING_TYPES[key];
	const current = currentOf(layer, key);
	return {
		reach,
		label,
		type,
		options: [],
		value: layer.bindings[key] ?? current,
		current,
		make: makeAction(doc, { reach, label, type, current }),
		onChange: (next) => {
			const patch = patchOf(spec, next);
			if (patch !== null) {
				doc.update(layer.id, patch);
				doc.commit(`set ${label.toLowerCase()}`);
			}
		},
	};
}
