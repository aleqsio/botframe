import { Menu } from "@base-ui-components/react/menu";
import type { ReactElement } from "react";
import { Icon } from "../Icon";
import type { IconName } from "../Icon";

export interface MenuAction {
	label: string;
	run: () => void;
}

export function IconMenu({
	actions,
	icon,
	label,
}: {
	label: string;
	icon: IconName;
	actions: readonly MenuAction[];
}): ReactElement {
	return (
		<Menu.Root modal={false}>
			<Menu.Trigger aria-label={label} className="arrange-button arrange-more" title={label}>
				<Icon name={icon} />
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner align="end" side="bottom">
					<Menu.Popup aria-label={label} className="layer-menu">
						{actions.map((action) => (
							<Menu.Item className="layer-menu-item" key={action.label} onClick={action.run}>
								<span className="layer-menu-label">{action.label}</span>
							</Menu.Item>
						))}
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}
