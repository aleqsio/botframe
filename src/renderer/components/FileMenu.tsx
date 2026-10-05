import { Menu } from "@base-ui-components/react/menu";
import { Fragment } from "react";
import type { ReactElement } from "react";
import { FILE_COMMANDS } from "../../shared/file";
import { acceleratorText } from "../acceleratorText";
import { runFileCommand } from "../file";
import type { Workspace } from "../state/workspace";

const MENU_LABEL = "File";
const MENU_GAP = 6;

export function FileMenu({ workspace }: { workspace: Workspace }): ReactElement {
	return (
		<Menu.Root modal={false}>
			<Menu.Trigger className="pill-button">{MENU_LABEL}</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner align="start" side="bottom" sideOffset={MENU_GAP}>
					<Menu.Popup aria-label={MENU_LABEL} className="layer-menu">
						{FILE_COMMANDS.map((command) => (
							<Fragment key={command.id}>
								{command.separatorBefore === true && (
									<Menu.Separator className="layer-menu-separator" />
								)}
								<Menu.Item
									className="layer-menu-item"
									onClick={() => {
										runFileCommand(command, workspace);
									}}
								>
									<span className="layer-menu-label">{command.label}</span>
									<span className="layer-menu-accelerator">
										{acceleratorText(command.accelerator ?? "")}
									</span>
								</Menu.Item>
							</Fragment>
						))}
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}
