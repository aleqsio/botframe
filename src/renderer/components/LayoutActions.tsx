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

const GROUPS: readonly CommandGroup[] = ["align", "spread", "place", "turn"];

function ActionButton({
	action,
	doc,
	layers,
	user,
}: {
	action: LayoutAction;
	doc: DesignDocument;
	layers: readonly Layer[];
	user: UserState;
}): ReactElement {
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

export function LayoutActions({
	doc,
	layers,
	user,
}: {
	doc: DesignDocument;
	layers: readonly Layer[];
	user: UserState;
}): ReactElement {
	return (
		<section aria-label={SECTION_NAME} className="arrange">
			<span className="group-label">{SECTION_NAME}</span>
			{GROUPS.map((group) => (
				<div className="arrange-row" key={group}>
					{LAYOUT_ACTIONS.filter((action) => action.group === group).map((action) => (
						<ActionButton action={action} doc={doc} key={action.id} layers={layers} user={user} />
					))}
				</div>
			))}
		</section>
	);
}
