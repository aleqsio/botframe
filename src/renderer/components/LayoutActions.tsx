import { Menu } from "@base-ui-components/react/menu";
import { Fragment } from "react";
import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { acceleratorText } from "../acceleratorText";
import type { CommandGroup } from "../input/command";
import { runEditCommand } from "../input/editCommand";
import { LAYOUT_ACTIONS, actionTip } from "../input/layoutAction";
import type { LayoutAction } from "../input/layoutAction";
import type { UserState } from "../state/userState";
import { Icon } from "./Icon";

const SECTION_NAME = "Arrange";
const MORE_LABEL = "More arrange actions";

const MENU_GROUPS: readonly CommandGroup[] = ["spread", "place", "turn"];

interface ActionProps {
	action: LayoutAction;
	doc: DesignDocument;
	layers: readonly Layer[];
	user: UserState;
}

interface SectionProps {
	doc: DesignDocument;
	layers: readonly Layer[];
	user: UserState;
}

function actionsIn(group: CommandGroup): readonly LayoutAction[] {
	return LAYOUT_ACTIONS.filter((action) => action.group === group);
}

function ActionButton({ action, doc, layers, user }: ActionProps): ReactElement {
	const ready = action.ready(doc, layers);

	return (
		<button
			aria-disabled={!ready}
			aria-label={action.label}
			className="arrange-button"
			onClick={() => {
				runEditCommand(action, doc, user);
			}}
			title={actionTip(action, ready, acceleratorText(action.accelerator))}
			type="button"
		>
			<Icon name={action.icon} />
		</button>
	);
}

function ActionItem({ action, doc, layers, user }: ActionProps): ReactElement {
	const ready = action.ready(doc, layers);

	return (
		<Menu.Item
			className="layer-menu-item arrange-menu-item"
			disabled={!ready}
			onClick={() => {
				runEditCommand(action, doc, user);
			}}
			title={ready ? undefined : action.needs}
		>
			<Icon name={action.icon} />
			<span className="layer-menu-label">{action.label}</span>
			<span className="layer-menu-accelerator">{acceleratorText(action.accelerator)}</span>
		</Menu.Item>
	);
}

function MoreMenu({ doc, layers, user }: SectionProps): ReactElement {
	return (
		<Menu.Root modal={false}>
			<Menu.Trigger
				aria-label={MORE_LABEL}
				className="arrange-button arrange-more"
				title={MORE_LABEL}
			>
				<Icon name="more" />
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner align="end" side="bottom">
					<Menu.Popup aria-label={MORE_LABEL} className="layer-menu">
						{MENU_GROUPS.map((group, index) => (
							<Fragment key={group}>
								{index > 0 && <Menu.Separator className="layer-menu-separator" />}
								{actionsIn(group).map((action) => (
									<ActionItem
										action={action}
										doc={doc}
										key={action.id}
										layers={layers}
										user={user}
									/>
								))}
							</Fragment>
						))}
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}

export function LayoutActions({ doc, layers, user }: SectionProps): ReactElement {
	return (
		<section aria-label={SECTION_NAME} className="arrange">
			<header className="layout-head">
				<span className="group-label">{SECTION_NAME}</span>
				<MoreMenu doc={doc} layers={layers} user={user} />
			</header>
			<div className="arrange-row">
				{actionsIn("align").map((action) => (
					<ActionButton action={action} doc={doc} key={action.id} layers={layers} user={user} />
				))}
			</div>
		</section>
	);
}
