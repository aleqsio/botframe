import type { ReactElement } from "react";
import type { PickerView } from "./FillTabs";
import type { FillOrder, FillRow } from "./fillOrder";
import { MediaRow } from "./MediaRow";
import type { FillProps } from "./paintEdit";
import { PaintRow } from "./PaintRow";

export function FillRows({
	onOpen,
	order,
	painted,
	...props
}: FillProps & {
	order: FillOrder;
	painted: boolean;
	onOpen: (view: PickerView) => void;
}): ReactElement {
	const { doc, layer } = props;
	const { media } = layer;
	const rows: Readonly<Record<FillRow, ReactElement | null>> = {
		media:
			media === null ? null : (
				<MediaRow
					doc={doc}
					drag={order.dragOf("media")}
					key="media"
					layer={layer}
					media={media}
					onOpen={() => {
						onOpen("media");
					}}
				/>
			),
		paint: painted ? (
			<PaintRow
				{...props}
				drag={order.dragOf("paint")}
				key="paint"
				onOpen={() => {
					onOpen("paint");
				}}
			/>
		) : null,
	};
	return <>{order.rows.map((row) => rows[row])}</>;
}
