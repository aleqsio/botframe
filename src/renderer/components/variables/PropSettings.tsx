import { Popover } from "@base-ui-components/react/popover";
import type { ReactElement } from "react";
import { Icon } from "../Icon";
import { PropFields } from "./PropFields";
import type { SettingsProps } from "./PropFields";
import { removeVariable } from "./scopeEdit";

const POPUP_GAP = 8;

function Actions({ doc, locked, onReset, owner, variable }: SettingsProps): ReactElement | null {
	if (locked && onReset === null) {
		return null;
	}
	return (
		<div className="value-actions">
			{onReset === null ? null : (
				<button className="value-action" onClick={onReset} type="button">
					Use the default in this copy
				</button>
			)}
			{locked ? null : (
				<button
					className="value-action value-remove"
					onClick={() => {
						removeVariable(doc, owner, variable.id);
					}}
					type="button"
				>
					<Icon name="minus" />
					Remove {variable.name}
				</button>
			)}
		</div>
	);
}

export function PropSettings(props: SettingsProps): ReactElement {
	const { variable } = props;
	return (
		<Popover.Root>
			<Popover.Trigger
				aria-label={`${variable.name} settings`}
				className="settings-button"
				title="Settings"
			>
				<Icon name="sliders" />
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner align="start" side="left" sideOffset={POPUP_GAP}>
					<Popover.Popup className="color-popup value-popup prop-settings">
						<PropFields {...props} />
						<Actions {...props} />
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}
