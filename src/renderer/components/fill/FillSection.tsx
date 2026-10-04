import { useRef, useState } from "react";
import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { RECTANGLE_DEFAULTS } from "../layerDefaults";
import { FillPicker } from "./FillPicker";
import type { PickerView } from "./FillTabs";
import { FillRows } from "./FillRows";
import { IconButton } from "./IconButton";
import { useFillOrder } from "./fillOrder";
import { hasPaint, setPaint, useFillProps } from "./paintEdit";

export function FillSection({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	const props = useFillProps(doc, layer);
	const { edit } = props;
	const [view, setView] = useState<PickerView | null>(null);
	const anchor = useRef<HTMLDivElement>(null);
	const painted = hasPaint(layer);
	const order = useFillOrder(doc, layer, anchor);

	return (
		<div {...order.section} className="field-group layout-section fill-section" ref={anchor}>
			<div className="layout-head">
				<span className="group-label">Fill</span>
				<IconButton
					disabled={painted && layer.media !== null}
					icon="plus"
					label="Add fill"
					onClick={() => {
						if (!painted) {
							setPaint(edit, RECTANGLE_DEFAULTS.fill);
						}
						setView(painted ? "media" : "paint");
					}}
				/>
			</div>
			<FillRows {...props} onOpen={setView} order={order} painted={painted} />
			{painted || layer.media !== null ? null : <span className="layout-sub">No fill</span>}
			<FillPicker {...props} anchor={anchor} onView={setView} view={view} />
		</div>
	);
}
