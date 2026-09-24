import { Menu } from "@base-ui-components/react/menu";
import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import { FILE_COMMANDS } from "../../shared/file";
import { acceleratorText } from "../acceleratorText";
import { runFileCommand } from "../file";
import type { UserState } from "../state/userState";

const MENU_LABEL = "File";
const MENU_GAP = 6;

export function FileMenu({ doc, user }: { doc: DesignDocument; user: UserState }): ReactElement {
	return (
		<Menu.Root modal={false}>
			<Menu.Trigger className="pill-button">{MENU_LABEL}</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner align="start" side="bottom" sideOffset={MENU_GAP}>
					<Menu.Popup aria-label={MENU_LABEL} className="layer-menu">
						{FILE_COMMANDS.map((command) => (
							<Menu.Item
								className="layer-menu-item"
								key={command.id}
								onClick={() => {
									runFileCommand(command, doc, user);
								}}
							>
								<span className="layer-menu-label">{command.label}</span>
								<span className="layer-menu-accelerator">
									{acceleratorText(command.accelerator)}
								</span>
							</Menu.Item>
						))}
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}
