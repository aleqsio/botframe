import { Menu } from "@base-ui-components/react/menu";
import { useRef } from "react";
import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { VariableType } from "../../../document/variable";
import { Icon } from "../Icon";
import type { IconName } from "../Icon";
import { addVariable, typeIcon, typeName } from "./scopeEdit";

interface TypeChoice {
	type: VariableType;
	hint: string;
}

const TYPES: readonly TypeChoice[] = [
	{ type: "choice", hint: "a set of options" },
	{ type: "boolean", hint: "on or off" },
	{ type: "text", hint: "words" },
	{ type: "color", hint: "a color" },
	{ type: "length", hint: "a size" },
	{ type: "number", hint: "a number" },
];

export interface AddChoice {
	name: string;
	hint: string;
	icon: IconName;
	add: () => string;
}

export function variableChoices(doc: DesignDocument, owner: string): readonly AddChoice[] {
	return TYPES.map(({ hint, type }) => ({
		name: typeName(type),
		hint,
		icon: typeIcon(type),
		add: () => addVariable(doc, owner, type),
	}));
}

export function AddMenu({
	choices,
	label,
	note,
	onAdded,
}: {
	choices: readonly AddChoice[];
	label: string;
	note: string;
	onAdded: (id: string) => void;
}): ReactElement {
	const added = useRef(false);
	return (
		<Menu.Root modal={false}>
			<Menu.Trigger className="add-button">
				<Icon name="plus" />
				{label}
				<Icon name="chevron" />
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner align="end" side="bottom">
					<Menu.Popup
						aria-label={label}
						className="layer-menu add-menu"
						finalFocus={() => {
							const back = !added.current;
							added.current = false;
							return back;
						}}
					>
						<span className="add-menu-note">{note}</span>
						{choices.map(({ add, hint, icon, name }) => (
							<Menu.Item
								className="layer-menu-item add-menu-item"
								key={name}
								label={name}
								onClick={() => {
									added.current = true;
									onAdded(add());
								}}
							>
								<span className="add-menu-glyph">
									<Icon name={icon} />
								</span>
								<span className="layer-menu-label">{name}</span>
								<span className="add-menu-hint">{hint}</span>
							</Menu.Item>
						))}
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}
