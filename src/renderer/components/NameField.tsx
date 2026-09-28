import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import { isChanged } from "../../document/layer";
import type { Layer } from "../../document/layer";
import { PropertyField } from "./PropertyField";
import { writeAll } from "./mixedFields";
import { mixedText, sharedOf } from "./mixedValue";
import { ChangedMark } from "./ChangedMark";

export function NameField({
	doc,
	layers,
}: {
	doc: DesignDocument;
	layers: readonly Layer[];
}): ReactElement {
	return (
		<ChangedMark changed={layers.some((layer) => isChanged(layer, "name"))}>
			<PropertyField
				label="Name"
				onCommit={(text) => {
					writeAll(
						doc,
						layers,
						{ name: text },
						layers.length > 1 ? "rename layers" : "rename layer",
					);
				}}
				value={mixedText(sharedOf(layers.map((layer) => layer.name)), String)}
			/>
		</ChangedMark>
	);
}
