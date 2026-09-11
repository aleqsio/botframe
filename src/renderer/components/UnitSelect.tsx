import { Select } from "@base-ui-components/react/select";
import type { ReactElement } from "react";
import { UNITS, isUnit } from "../../document/length";
import type { Unit } from "../../document/length";
import { Icon } from "./Icon";
import type { LayerField, UnitChoice } from "./layerFields";

const MENU_GAP = 6;

export interface UnitSelectProps {
	field: LayerField;
	choice: UnitChoice;
	onPick: (unit: Unit) => void;
}

function UnitMenu({ possible }: { possible: ReadonlySet<Unit> }): ReactElement {
	return (
		<Select.Portal>
			<Select.Positioner
				align="end"
				alignItemWithTrigger={false}
				side="bottom"
				sideOffset={MENU_GAP}
			>
				<Select.Popup className="unit-menu">
					{UNITS.map((unit) => (
						<Select.Item
							className="unit-item"
							disabled={!possible.has(unit)}
							key={unit}
							value={unit}
						>
							<Select.ItemText>{unit}</Select.ItemText>
							<Select.ItemIndicator className="unit-mark">
								<Icon name="check" />
							</Select.ItemIndicator>
						</Select.Item>
					))}
				</Select.Popup>
			</Select.Positioner>
		</Select.Portal>
	);
}

export function UnitSelect({ choice, field, onPick }: UnitSelectProps): ReactElement {
	return (
		<Select.Root
			onValueChange={(value) => {
				if (value !== null && isUnit(value)) {
					onPick(value);
				}
			}}
			value={field.unit}
		>
			<Select.Trigger aria-label={`${field.label} unit`} className="chip-unit unit-trigger">
				<Select.Value />
				<span aria-hidden="true" className="unit-chevron">
					<Icon name="chevron" />
				</span>
			</Select.Trigger>
			<UnitMenu possible={choice.possible} />
		</Select.Root>
	);
}
