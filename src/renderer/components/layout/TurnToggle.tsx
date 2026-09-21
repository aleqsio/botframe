import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { outOfFlow } from "../../layerStyle";
import { useLayer } from "../../useDocument";

const TURN_TIP = "Rotation reserves the turned box in a Row, Column or Grid";

export function TurnToggle({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	const parent = useLayer(doc, layer.parent);
	const { turnedBox } = layer.layout;

	return (
		<button
			aria-pressed={turnedBox}
			className="layout-flag"
			disabled={outOfFlow(parent?.layout.display ?? null, layer.layout.position)}
			onClick={() => {
				doc.update(layer.id, { layout: { turnedBox: !turnedBox } });
				doc.commit("set turned box");
			}}
			title={TURN_TIP}
			type="button"
		>
			Affects layout
		</button>
	);
}
