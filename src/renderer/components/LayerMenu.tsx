import { Menu } from "@base-ui-components/react/menu";
import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import { useSlot } from "../state/useSlot";
import type { UserState } from "../state/userState";
import { useLayer } from "../useDocument";
import { EditMenuSection } from "./EditMenuSection";
import { layerEntry } from "./layerEntry";

const LAYERS_LABEL = "Layers under the pointer";

function anchorAt(client: Point): { getBoundingClientRect: () => DOMRect } {
	return { getBoundingClientRect: () => new DOMRect(client.x, client.y, 0, 0) };
}

function LayerMenuItem({
	doc,
	id,
	onSelect,
}: {
	doc: DesignDocument;
	id: LayerId;
	onSelect: (id: LayerId) => void;
}): ReactElement {
	const entry = layerEntry(useLayer(doc, id));

	return (
		<Menu.Item
			className="layer-menu-item"
			onClick={() => {
				onSelect(id);
			}}
		>
			<span aria-hidden="true" className="layer-menu-swatch" style={{ background: entry.swatch }} />
			{entry.label}
		</Menu.Item>
	);
}

export function LayerMenu({
	doc,
	user,
}: {
	doc: DesignDocument;
	user: UserState;
}): ReactElement | null {
	const menu = useSlot(user.menu);

	if (menu === null) {
		return null;
	}

	function selectLayer(id: LayerId): void {
		user.selection.set([id]);
		user.menu.set(null);
	}

	return (
		<Menu.Root
			modal={false}
			onOpenChange={(open) => {
				if (!open) {
					user.menu.set(null);
				}
			}}
			open
		>
			<Menu.Portal>
				<Menu.Positioner align="start" anchor={anchorAt(menu.client)} side="right">
					<Menu.Popup aria-label="Context menu" className="layer-menu">
						{menu.layerIds.length > 0 && (
							<>
								<Menu.Group className="layer-menu-group">
									<Menu.GroupLabel className="layer-menu-group-label">
										{LAYERS_LABEL}
									</Menu.GroupLabel>
									{menu.layerIds.map((id) => (
										<LayerMenuItem doc={doc} id={id} key={id} onSelect={selectLayer} />
									))}
								</Menu.Group>
								<Menu.Separator className="layer-menu-separator" />
							</>
						)}
						<EditMenuSection doc={doc} user={user} />
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}
