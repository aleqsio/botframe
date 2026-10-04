import { Select } from "@base-ui-components/react/select";
import type { ReactElement } from "react";
import type { TextGeometry, TextStyle } from "../../../document/text";
import type { GoogleFamily } from "../../fonts/googleFonts";
import { nearestWeight } from "../../fonts/googleFonts";
import { weightChoices } from "../../fonts/fontSearch";
import { Icon } from "../Icon";
import { FontPicker } from "./FontPicker";

const MENU_GAP = 6;

export interface FontRowsProps {
	geometry: TextGeometry;
	families: readonly GoogleFamily[];
	inFile: ReadonlySet<string>;
	pick: (change: Partial<TextStyle>) => void;
}

function WeightMenu({
	choices,
	onPick,
	value,
}: {
	choices: readonly number[];
	onPick: (weight: number) => void;
	value: number;
}): ReactElement {
	return (
		<Select.Root
			onValueChange={(next) => {
				onPick(Number(next));
			}}
			value={String(value)}
		>
			<Select.Trigger aria-label="Font weight" className="property-input choice-trigger">
				<span className="choice-value">
					<Select.Value />
				</span>
				<Icon name="chevron" />
			</Select.Trigger>
			<Select.Portal>
				<Select.Positioner alignItemWithTrigger={false} side="bottom" sideOffset={MENU_GAP}>
					<Select.Popup className="unit-menu">
						{choices.map((weight) => (
							<Select.Item className="unit-item" key={weight} value={String(weight)}>
								<Select.ItemText>{weight}</Select.ItemText>
								<Select.ItemIndicator className="unit-mark">
									<Icon name="check" />
								</Select.ItemIndicator>
							</Select.Item>
						))}
					</Select.Popup>
				</Select.Positioner>
			</Select.Portal>
		</Select.Root>
	);
}

export function FontRows({ families, geometry, inFile, pick }: FontRowsProps): ReactElement {
	const family = families.find((held) => held.family === geometry.fontFamily);
	const italicTip = family?.italic === false ? "This font has no italic style" : undefined;

	return (
		<>
			<div className="chip-row">
				<FontPicker
					families={families}
					inFile={inFile}
					onPick={(next) => {
						pick({
							fontFamily: next.family,
							fontWeight: nearestWeight(next, geometry.fontWeight),
							italic: geometry.italic && next.italic,
						});
					}}
					value={geometry.fontFamily}
				/>
			</div>
			<div className="chip-row">
				<WeightMenu
					choices={weightChoices(family)}
					onPick={(fontWeight) => {
						pick({ fontWeight });
					}}
					value={geometry.fontWeight}
				/>
				<button
					aria-disabled={italicTip !== undefined}
					aria-pressed={geometry.italic}
					className="layout-flag"
					onClick={() => {
						if (italicTip === undefined) {
							pick({ italic: !geometry.italic });
						}
					}}
					title={italicTip}
					type="button"
				>
					<Icon name="italic" />
					Italic
				</button>
			</div>
		</>
	);
}
