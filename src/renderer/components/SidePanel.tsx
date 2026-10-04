import type { ReactElement, RefObject } from "react";
import type { DesignDocument } from "../../document/document";
import { useSlot } from "../state/useSlot";
import type { SidePanel as Panel, UserState } from "../state/userState";
import { ComponentList } from "./ComponentList";
import { Icon } from "./Icon";
import { LayerList } from "./LayerList";
import { Segmented } from "./layout/Segmented";
import type { SegmentOption } from "./layout/Segmented";

const PANELS: readonly SegmentOption<Panel>[] = [
	{ value: "layers", label: "Layers", icon: <Icon name="layers" /> },
	{ value: "components", label: "Components", icon: <Icon name="component" /> },
];

export function SidePanel({
	doc,
	stage,
	user,
}: {
	doc: DesignDocument;
	stage: RefObject<HTMLElement | null>;
	user: UserState;
}): ReactElement {
	const panel = useSlot(user.panel);

	return (
		<div id="side-panel">
			<Segmented
				label="Panel"
				onPick={(picked) => {
					user.panel.set(picked);
				}}
				options={PANELS}
				value={panel}
			/>
			{panel === "layers" ? (
				<LayerList doc={doc} user={user} />
			) : (
				<ComponentList doc={doc} stage={stage} user={user} />
			)}
		</div>
	);
}
