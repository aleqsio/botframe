import { Popover } from "@base-ui-components/react/popover";
import type { ReactElement, RefObject } from "react";
import { paintOf } from "../../../document/paint";
import type { Paint } from "../../../document/paint";
import { FillTabs, tabOf } from "./FillTabs";
import type { PickerView } from "./FillTabs";
import { MediaTab } from "./MediaTab";
import type { FillProps } from "./paintEdit";
import { PaintBody } from "./PaintPicker";

const POPUP_GAP = 10;

function TabBody({
	paint,
	view,
	...props
}: FillProps & { paint: Paint; view: PickerView }): ReactElement {
	const { doc, edit, layer, target } = props;
	if (view === "media") {
		return <MediaTab doc={doc} layer={layer} />;
	}
	return <PaintBody edit={edit} paint={paint} target={target} />;
}

export function FillPicker({
	anchor,
	onView,
	view,
	...props
}: FillProps & {
	anchor: RefObject<HTMLElement | null>;
	view: PickerView | null;
	onView: (view: PickerView | null) => void;
}): ReactElement {
	const paint = paintOf(props.edit.value);
	return (
		<Popover.Root
			onOpenChange={(open) => {
				if (!open) {
					onView(null);
				}
			}}
			open={view !== null}
		>
			<Popover.Portal>
				<Popover.Positioner align="start" anchor={anchor} side="left" sideOffset={POPUP_GAP}>
					{view === null ? null : (
						<Popover.Popup className="color-popup fill-popup" data-tab={tabOf(view, paint)}>
							<FillTabs edit={props.edit} media={{ view, onView }} paint={paint} />
							<TabBody {...props} paint={paint} view={view} />
						</Popover.Popup>
					)}
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}
