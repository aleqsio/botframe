import { Menu } from "@base-ui-components/react/menu";
import { useRef } from "react";
import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { VariableType } from "../../../document/variable";
import { Icon } from "../Icon";
import type { IconName } from "../Icon";
import { addVariable, typeIcon, typeName } from "./scopeEdit";

const TYPES: readonly VariableType[] = ["choice", "boolean", "text", "color", "length", "number"];

export const VALUE_TYPES = TYPES.filter((type) => type !== "color");

export interface AddChoice {
	name: string;
	icon: IconName;
	pick: () => void;
	unavailable?: string;
}

export function variableChoices(
	doc: DesignDocument,
	owner: string,
	onAdded: (id: string) => void,
	types: readonly VariableType[] = TYPES,
): readonly AddChoice[] {
	return types.map((type) => ({
		name: typeName(type),
		icon: typeIcon(type),
		pick: () => {
			onAdded(addVariable(doc, owner, type));
		},
	}));
}

function Trigger({ compact, label }: { compact: boolean; label: string }): ReactElement {
	return compact ? (
		<Menu.Trigger aria-label={label} className="icon-button" title={label}>
			<Icon name="plus" />
		</Menu.Trigger>
	) : (
		<Menu.Trigger className="add-button">
			<Icon name="plus" />
			{label}
			<Icon name="chevron" />
		</Menu.Trigger>
	);
}

export function AddMenu({
	choices,
	compact = false,
	label,
}: {
	choices: readonly AddChoice[];
	compact?: boolean;
	label: string;
}): ReactElement {
	const added = useRef(false);
	return (
		<Menu.Root modal={false}>
			<Trigger compact={compact} label={label} />
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
						{choices.map(({ icon, name, pick, unavailable }) => (
							<Menu.Item
								className="layer-menu-item add-menu-item"
								disabled={unavailable !== undefined}
								key={name}
								label={name}
								onClick={() => {
									added.current = true;
									pick();
								}}
								title={unavailable}
							>
								<span className="add-menu-glyph">
									<Icon name={icon} />
								</span>
								<span className="layer-menu-label">{name}</span>
							</Menu.Item>
						))}
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}
