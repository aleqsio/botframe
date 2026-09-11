import { Menu } from "@base-ui-components/react/menu";
import { Fragment } from "react";
import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { EditMenuItem } from "../../shared/editMenu";
import { acceleratorText } from "../acceleratorText";
import { contextMenuItems } from "../editMenu";
import { commandById, runEditCommand } from "../input/editCommand";
import { useSlot } from "../state/useSlot";
import type { UserState } from "../state/userState";

const SUBMENU_MARK = "›";
const SECTION_LABEL = "Edit";

interface ItemProps {
	doc: DesignDocument;
	item: EditMenuItem;
	user: UserState;
}

function run(item: EditMenuItem, doc: DesignDocument, user: UserState): void {
	user.menu.set(null);
	const command = commandById(item.id);
	if (command !== null) {
		runEditCommand(command, doc, user);
	}
}

function CommandItem({ doc, item, user }: ItemProps): ReactElement {
	return (
		<Menu.Item
			className="layer-menu-item"
			disabled={!item.enabled}
			onClick={() => {
				run(item, doc, user);
			}}
		>
			<span className="layer-menu-label">{item.label}</span>
			<span className="layer-menu-accelerator">{acceleratorText(item.accelerator)}</span>
		</Menu.Item>
	);
}

function SubmenuItem({ doc, item, user }: ItemProps): ReactElement {
	return (
		<Menu.SubmenuRoot>
			<Menu.SubmenuTrigger className="layer-menu-item" disabled={!item.enabled}>
				<span className="layer-menu-label">{item.label}</span>
				<span aria-hidden="true" className="layer-menu-accelerator">
					{SUBMENU_MARK}
				</span>
			</Menu.SubmenuTrigger>
			<Menu.Portal>
				<Menu.Positioner align="start" side="right">
					<Menu.Popup aria-label={item.label} className="layer-menu">
						{(item.submenu ?? []).map((format) => (
							<CommandItem doc={doc} item={format} key={format.id} user={user} />
						))}
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.SubmenuRoot>
	);
}

function useContextItems(doc: DesignDocument, user: UserState): readonly EditMenuItem[] {
	useSlot(user.selection);
	useSlot(user.pasteReady);
	return contextMenuItems(doc, user);
}

function MenuEntry({ doc, item, user }: ItemProps): ReactElement {
	return item.submenu === undefined ? (
		<CommandItem doc={doc} item={item} user={user} />
	) : (
		<SubmenuItem doc={doc} item={item} user={user} />
	);
}

export function EditMenuSection({
	doc,
	user,
}: {
	doc: DesignDocument;
	user: UserState;
}): ReactElement {
	const items = useContextItems(doc, user);

	return (
		<Menu.Group aria-label={SECTION_LABEL} className="layer-menu-group">
			{items.map((item) => (
				<Fragment key={item.id}>
					{item.separatorBefore === true && <Menu.Separator className="layer-menu-separator" />}
					<MenuEntry doc={doc} item={item} user={user} />
				</Fragment>
			))}
		</Menu.Group>
	);
}
