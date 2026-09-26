import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { Icon } from "../Icon";
import { BindButton } from "../variables/BindButton";
import { BoundSummary } from "../variables/BoundSummary";
import { useLayerTarget } from "../variables/layerTarget";

const MIRROR_TIP =
	"Mirrors the layer about its origin. Flip uses this only for a layer that no other property can mirror";

export function MirrorToggle({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	const { mirrored } = layer;
	const target = useLayerTarget(doc, layer, {
		key: "mirrored",
		label: "Mirrored",
		plain: (value) => (typeof value === "boolean" ? { mirrored: value } : null),
	});
	const bound = layer.bindings.mirrored;

	return (
		<div className="mirror-row">
			{bound === undefined ? (
				<button
					aria-pressed={mirrored}
					className="layout-flag"
					onClick={() => {
						target.onChange(!mirrored);
					}}
					title={MIRROR_TIP}
					type="button"
				>
					<Icon name="flipX" />
					Mirrored
				</button>
			) : (
				<BoundSummary bound={bound} now={mirrored} view={target.reach.view} />
			)}
			<BindButton target={target} />
		</div>
	);
}
