import type { ReactElement } from "react";
import type { Paint } from "../../../document/paint";
import { Icon } from "../Icon";
import { Segmented } from "../layout/Segmented";
import type { SegmentOption } from "../layout/Segmented";
import { setPaint } from "./paintEdit";
import type { PaintEdit } from "./paintEdit";
import { paintTextAs } from "./stops";

export type PickerView = "paint" | "media";

type FillTab = Paint["kind"] | "media";

const TABS: readonly SegmentOption<FillTab>[] = [
	{ value: "solid", label: "Solid", icon: <Icon name="rectangle" /> },
	{ value: "gradient", label: "Gradient", icon: <Icon name="gradient" /> },
	{ value: "media", label: "Media", icon: <Icon name="image" /> },
];

export function tabOf(view: PickerView, paint: Paint): FillTab {
	return view === "media" ? "media" : paint.kind;
}

export function FillTabs({
	edit,
	onView,
	paint,
	view,
}: {
	edit: PaintEdit;
	paint: Paint;
	view: PickerView;
	onView: (view: PickerView) => void;
}): ReactElement {
	return (
		<Segmented
			label="Fill type"
			onPick={(tab) => {
				onView(tab === "media" ? "media" : "paint");
				if (tab !== "media" && tab !== paint.kind) {
					setPaint(edit, paintTextAs(paint, tab));
				}
			}}
			options={TABS}
			value={tabOf(view, paint)}
		/>
	);
}
