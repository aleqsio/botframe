import { Popover } from "@base-ui-components/react/popover";
import { useRef, useState } from "react";
import type { ReactElement } from "react";
import type { GoogleFamily } from "../../fonts/googleFonts";
import { matchingFamilies } from "../../fonts/fontSearch";
import { Icon } from "../Icon";

const POPUP_GAP = 4;
const OFFLINE_TIP = "Connect to the network to add this font to the file";

function FamilyRow({
	current,
	family,
	inFile,
	onPick,
}: {
	current: string;
	family: GoogleFamily;
	inFile: boolean;
	onPick: () => void;
}): ReactElement {
	const blocked = !inFile && !navigator.onLine;
	return (
		<div className="choice-option">
			<button
				aria-disabled={blocked}
				aria-pressed={family.family === current}
				className="choice-pick"
				onClick={blocked ? undefined : onPick}
				title={blocked ? OFFLINE_TIP : undefined}
				type="button"
			>
				<span className="choice-check">
					{family.family === current ? <Icon name="check" /> : null}
				</span>
				<span className="choice-value">{family.family}</span>
				<span className="font-category">{inFile ? "In file" : family.category}</span>
			</button>
		</div>
	);
}

export function FontPicker({
	families,
	inFile,
	onPick,
	value,
}: {
	families: readonly GoogleFamily[];
	inFile: ReadonlySet<string>;
	onPick: (family: GoogleFamily) => void;
	value: string;
}): ReactElement {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const search = useRef<HTMLInputElement>(null);

	return (
		<Popover.Root onOpenChange={setOpen} open={open}>
			<Popover.Trigger aria-label="Font" className="property-input choice-trigger">
				<span className="choice-value">{value}</span>
				<Icon name="chevron" />
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner align="start" side="bottom" sideOffset={POPUP_GAP}>
					<Popover.Popup className="color-popup choice-popup font-popup" initialFocus={search}>
						<input
							aria-label="Search fonts"
							className="property-input font-search"
							onChange={(event) => {
								setQuery(event.target.value);
							}}
							placeholder="Search Google Fonts"
							ref={search}
							type="search"
							value={query}
						/>
						<div className="font-list">
							{matchingFamilies(families, query).map((family) => (
								<FamilyRow
									current={value}
									family={family}
									inFile={inFile.has(family.family)}
									key={family.family}
									onPick={() => {
										onPick(family);
										setOpen(false);
									}}
								/>
							))}
						</div>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}
