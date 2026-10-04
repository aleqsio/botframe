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

const PAINT_TABS: readonly SegmentOption<FillTab>[] = [
	{ value: "solid", label: "Solid", icon: <Icon name="rectangle" /> },
	{ value: "gradient", label: "Gradient", icon: <Icon name="gradient" /> },
];

const FILL_TABS: readonly SegmentOption<FillTab>[] = [
	...PAINT_TABS,
	{ value: "media", label: "Media", icon: <Icon name="image" /> },
];

export interface MediaView {
	view: PickerView;
	onView: (view: PickerView) => void;
}

export function tabOf(view: PickerView, paint: Paint): FillTab {
	return view === "media" ? "media" : paint.kind;
}

export function FillTabs({
	edit,
	media,
	paint,
}: {
	edit: PaintEdit;
	paint: Paint;
	media: MediaView | null;
}): ReactElement {
	return (
		<Segmented
			label="Fill type"
			onPick={(tab) => {
				media?.onView(tab === "media" ? "media" : "paint");
				if (tab !== "media" && tab !== paint.kind) {
					setPaint(edit, paintTextAs(paint, tab));
				}
			}}
			options={media === null ? PAINT_TABS : FILL_TABS}
			value={media === null ? paint.kind : tabOf(media.view, paint)}
		/>
	);
}
