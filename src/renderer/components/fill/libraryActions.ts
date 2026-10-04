import type { DesignDocument } from "../../../document/document";
import type { LayerId } from "../../../document/layer";
import { gradientText } from "../../../document/paint";
import type { Paint } from "../../../document/paint";
import { DOCUMENT_SCOPE } from "../../../document/variable";
import { makeVariable } from "../variables/scopeEdit";

const FILL_MESSAGE = "set fill";
const ADD_MESSAGE = "add variable";

const NEW_PAINT: Readonly<Record<Paint["kind"], { name: string; initial: string }>> = {
	solid: { name: "color", initial: "#d9d9d9" },
	gradient: {
		name: "gradient",
		initial: gradientText({
			shape: "linear",
			angle: 180,
			stops: [
				{ color: "#0d99ff", position: 0 },
				{ color: "#8b5cf6", position: 1 },
			],
		}),
	},
};

export function addPaintVariable(doc: DesignDocument, kind: Paint["kind"]): string {
	const id = makeVariable(doc, DOCUMENT_SCOPE, { ...NEW_PAINT[kind], type: "color", options: [] });
	doc.commit(ADD_MESSAGE);
	return id;
}

export function bindFill(doc: DesignDocument, layers: readonly LayerId[], variable: string): void {
	for (const layer of layers) {
		doc.update(layer, { bindings: { fill: { var: variable } } });
	}
	doc.commit(FILL_MESSAGE);
}
