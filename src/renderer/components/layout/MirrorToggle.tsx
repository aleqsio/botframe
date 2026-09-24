import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { Icon } from "../Icon";

const MIRROR_TIP =
	"Mirrors the layer about its origin. Flip uses this only for a layer that no other property can mirror";

export function MirrorToggle({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	const { mirrored } = layer;

	return (
		<div className="chip-row">
			<button
				aria-pressed={mirrored}
				className="layout-flag"
				onClick={() => {
					doc.update(layer.id, { mirrored: !mirrored });
					doc.commit("set mirrored");
				}}
				title={MIRROR_TIP}
				type="button"
			>
				<Icon name="flipX" />
				Mirrored
			</button>
		</div>
	);
}
