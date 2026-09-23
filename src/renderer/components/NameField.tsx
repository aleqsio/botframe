import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { PropertyField } from "./PropertyField";
import { writeAll } from "./mixedFields";
import { mixedText, sharedOf } from "./mixedValue";

function sameText(value: string): string {
	return value;
}

export function NameField({
	doc,
	layers,
}: {
	doc: DesignDocument;
	layers: readonly Layer[];
}): ReactElement {
	return (
		<PropertyField
			label="Name"
			onCommit={(text) => {
				writeAll(doc, layers, { name: text }, layers.length > 1 ? "rename layers" : "rename layer");
			}}
			value={mixedText(sharedOf(layers.map((layer) => layer.name)), sameText)}
		/>
	);
}
