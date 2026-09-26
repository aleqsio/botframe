import { Menu } from "@base-ui-components/react/menu";
import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { VariableType } from "../../../document/variable";
import { Icon } from "../Icon";
import type { IconName } from "../Icon";
import { addVariable, typeName } from "./scopeEdit";

interface TypeChoice {
	type: VariableType;
	icon: IconName;
	hint: string;
}

const TYPES: readonly TypeChoice[] = [
	{ type: "choice", icon: "list", hint: "a set of options" },
	{ type: "boolean", icon: "toggle", hint: "on or off" },
	{ type: "text", icon: "text", hint: "words" },
	{ type: "color", icon: "ellipse", hint: "a color" },
	{ type: "length", icon: "ruler", hint: "a size" },
	{ type: "number", icon: "hash", hint: "a number" },
];

export function AddMenu({
	doc,
	label,
	note,
	owner,
}: {
	doc: DesignDocument;
	owner: string;
	label: string;
	note: string;
}): ReactElement {
	return (
		<Menu.Root modal={false}>
			<Menu.Trigger className="add-button">
				<Icon name="plus" />
				{label}
				<Icon name="chevron" />
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner align="end" side="bottom">
					<Menu.Popup aria-label={label} className="layer-menu add-menu">
						<span className="add-menu-note">{note}</span>
						{TYPES.map(({ hint, icon, type }) => (
							<Menu.Item
								className="layer-menu-item add-menu-item"
								key={type}
								label={typeName(type)}
								onClick={() => {
									addVariable(doc, owner, type);
								}}
							>
								<span className="add-menu-glyph">
									<Icon name={icon} />
								</span>
								<span className="layer-menu-label">{typeName(type)}</span>
								<span className="add-menu-hint">{hint}</span>
							</Menu.Item>
						))}
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}
