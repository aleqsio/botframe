import type { ReactElement } from "react";
import { closeTab } from "../file";
import { useSlot } from "../state/useSlot";
import { Tab, tabName } from "../state/workspace";
import type { Workspace } from "../state/workspace";
import { Icon } from "./Icon";

const LIST_LABEL = "Documents";
const NEW_TAB = "New tab";

interface ItemProps {
	tab: Tab;
	selected: boolean;
	workspace: Workspace;
}

function TabItem({ tab, selected, workspace }: ItemProps): ReactElement {
	const name = tabName(useSlot(tab.file));

	return (
		<div className="tab" data-selected={selected ? "" : undefined}>
			<button
				aria-selected={selected}
				className="tab-name"
				onClick={() => {
					workspace.active.set(tab);
				}}
				role="tab"
				title={name}
				type="button"
			>
				{name}
			</button>
			<button
				aria-label={`Close ${name}`}
				className="tab-close"
				onClick={() => {
					closeTab(workspace, tab);
				}}
				type="button"
			>
				<Icon name="close" />
			</button>
		</div>
	);
}

export function TabBar({ workspace }: { workspace: Workspace }): ReactElement {
	const tabs = useSlot(workspace.tabs);
	const active = useSlot(workspace.active);

	return (
		<div id="tab-bar">
			<div aria-label={LIST_LABEL} className="tab-list" role="tablist">
				{tabs.map((tab) => (
					<TabItem key={tab.id} selected={tab === active} tab={tab} workspace={workspace} />
				))}
			</div>
			<button
				aria-label={NEW_TAB}
				className="pill-button"
				onClick={() => {
					workspace.add(Tab.untitled());
				}}
				title={NEW_TAB}
				type="button"
			>
				<Icon name="plus" />
			</button>
		</div>
	);
}
