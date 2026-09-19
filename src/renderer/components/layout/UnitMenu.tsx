import { Select } from "@base-ui-components/react/select";
import type { ReactElement } from "react";
import { Icon } from "../Icon";

const MENU_GAP = 6;

export interface UnitMenuProps<U extends string> {
	units: readonly U[];
	value: U;
	possible?: ReadonlySet<U> | undefined;
	onPick: (unit: U) => void;
	label: string;
	tips?: Partial<Record<U, string>> | undefined;
	disabled?: boolean | undefined;
}

function UnitItems<U extends string>({
	possible,
	tips,
	units,
}: Pick<UnitMenuProps<U>, "possible" | "tips" | "units">): ReactElement {
	return (
		<Select.Portal>
			<Select.Positioner
				align="end"
				alignItemWithTrigger={false}
				side="bottom"
				sideOffset={MENU_GAP}
			>
				<Select.Popup className="unit-menu">
					{units.map((unit) => (
						<Select.Item
							className="unit-item"
							disabled={possible !== undefined && !possible.has(unit)}
							key={unit}
							title={tips?.[unit]}
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

export function UnitMenu<U extends string>({
	disabled,
	label,
	onPick,
	possible,
	tips,
	units,
	value,
}: UnitMenuProps<U>): ReactElement {
	return (
		<Select.Root
			disabled={disabled ?? false}
			onValueChange={(next) => {
				const unit = units.find((known) => known === next);
				if (unit !== undefined) {
					onPick(unit);
				}
			}}
			value={value}
		>
			<Select.Trigger aria-label={`${label} unit`} className="chip-unit unit-trigger">
				<Select.Value />
				<span aria-hidden="true" className="unit-chevron">
					<Icon name="chevron" />
				</span>
			</Select.Trigger>
			<UnitItems possible={possible} tips={tips} units={units} />
		</Select.Root>
	);
}
