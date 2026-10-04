import type { ReactElement } from "react";
import { isChanged } from "../../../document/layer";
import { paintOf } from "../../../document/paint";
import { BindButton } from "../variables/BindButton";
import { BoundSummary } from "../variables/BoundSummary";
import { PaintText } from "./ColorText";
import { IconButton } from "./IconButton";
import type { FillProps } from "./paintEdit";

const REMOVE_MESSAGE = "remove fill";

export function PaintRow({ onOpen, ...props }: FillProps & { onOpen: () => void }): ReactElement {
	const { doc, edit, layer, target } = props;
	const bound = layer.bindings.fill;
	return (
		<div
			className="property-field color-field fill-row"
			data-changed={isChanged(layer, "fill") ? "" : undefined}
		>
			<button aria-label="Fill picker" className="color-swatch" onClick={onOpen} type="button">
				<span className="color-swatch-fill" style={{ background: layer.fill }} />
			</button>
			{bound === undefined ? (
				<PaintText edit={edit} onOpen={onOpen} paint={paintOf(layer.fill)} />
			) : (
				<BoundSummary bound={bound} now={layer.fill} view={target.reach.view} />
			)}
			<IconButton
				icon="minus"
				label="Remove fill"
				onClick={() => {
					doc.update(layer.id, { fill: "transparent", bindings: { fill: null } });
					doc.commit(REMOVE_MESSAGE);
				}}
			/>
			<BindButton target={target} />
		</div>
	);
}
