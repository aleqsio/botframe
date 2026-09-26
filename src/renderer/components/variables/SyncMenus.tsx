import { Menu } from "@base-ui-components/react/menu";
import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import {
	applyInstanceChanges,
	resetInstance,
	setInstanceSync,
} from "../../../document/instanceActions";
import { SYNC_MODES, isSyncMode } from "../../../document/instanceState";
import type { InstanceState, SyncMode } from "../../../document/instanceState";
import { changeCount } from "../../../document/instanceSync";
import type { SyncPart } from "../../../document/instanceSync";
import type { LayerId } from "../../../document/path";
import { Icon } from "../Icon";
import type { IconName } from "../Icon";

interface Choice {
	icon: IconName;
	label: string;
	hint: string;
}

export interface SyncProps {
	doc: DesignDocument;
	id: LayerId;
	instance: InstanceState;
}

const SYNC_LABEL = "Sync to all instances";
const APPLY_LABEL = "Apply to all instances";

const MODES: Readonly<Record<SyncMode, Choice>> = {
	all: { icon: "lock", label: "Keep all in sync", hint: "Every edit changes all instances" },
	style: {
		icon: "lockHalf",
		label: "Keep style in sync",
		hint: "Geometry stays on this instance",
	},
	none: { icon: "lockOpen", label: "Don’t sync", hint: "Every edit stays on this instance" },
};

const PARTS: readonly (Choice & { part: SyncPart })[] = [
	{ part: "all", icon: "apply", label: "Everything", hint: "Geometry and style" },
	{ part: "geometry", icon: "fit", label: "Geometry only", hint: "Size, position, rotation, skew" },
	{ part: "style", icon: "style", label: "Style only", hint: "Fill, corners, content" },
];

function ChoiceBody({ choice, count }: { choice: Choice; count?: number }): ReactElement {
	return (
		<>
			<span className="add-menu-glyph">
				<Icon name={choice.icon} />
			</span>
			<span className="sync-text">
				<span className="layer-menu-label">{choice.label}</span>
				<span className="add-menu-hint">{choice.hint}</span>
			</span>
			{count === undefined ? null : <span className="sync-count">{count}</span>}
		</>
	);
}

export function SyncMenu({ doc, id, instance }: SyncProps): ReactElement {
	const current = MODES[instance.sync];
	return (
		<Menu.Root modal={false}>
			<Menu.Trigger aria-label={SYNC_LABEL} className="sync-button" title={current.label}>
				<Icon name={current.icon} />
				<Icon name="chevron" />
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner align="end" side="bottom">
					<Menu.Popup aria-label={SYNC_LABEL} className="layer-menu add-menu sync-menu">
						<span className="add-menu-note">{SYNC_LABEL}</span>
						<Menu.RadioGroup
							onValueChange={(value: unknown) => {
								if (isSyncMode(value)) {
									setInstanceSync(doc, id, value);
								}
							}}
							value={instance.sync}
						>
							{SYNC_MODES.map((mode) => (
								<Menu.RadioItem
									className="layer-menu-item sync-item"
									closeOnClick
									key={mode}
									label={MODES[mode].label}
									value={mode}
								>
									<ChoiceBody choice={MODES[mode]} />
									<Menu.RadioItemIndicator className="sync-check">
										<Icon name="check" />
									</Menu.RadioItemIndicator>
								</Menu.RadioItem>
							))}
						</Menu.RadioGroup>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}

export function ApplyMenu({ doc, id, instance }: SyncProps): ReactElement {
	const total = changeCount(instance.overrides, "all");
	return (
		<Menu.Root modal={false}>
			<Menu.Trigger
				aria-label={APPLY_LABEL}
				className="apply-button"
				data-changed={total > 0 ? "" : undefined}
				disabled={total === 0}
				title={total === 0 ? "This instance has no changes" : APPLY_LABEL}
			>
				<Icon name="apply" />
				{total > 0 ? <span className="apply-count">{total}</span> : null}
				<Icon name="chevron" />
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner align="end" side="bottom">
					<Menu.Popup aria-label={APPLY_LABEL} className="layer-menu add-menu sync-menu">
						<span className="add-menu-note">{APPLY_LABEL}</span>
						{PARTS.map((choice) => {
							const count = changeCount(instance.overrides, choice.part);
							return (
								<Menu.Item
									className="layer-menu-item sync-item"
									disabled={count === 0}
									key={choice.part}
									label={choice.label}
									onClick={() => {
										applyInstanceChanges(doc, id, choice.part);
									}}
								>
									<ChoiceBody choice={choice} count={count} />
								</Menu.Item>
							);
						})}
						<Menu.Separator className="sync-separator" />
						<Menu.Item
							className="layer-menu-item sync-item"
							label="Reset this instance"
							onClick={() => {
								resetInstance(doc, id);
							}}
						>
							<ChoiceBody
								choice={{
									icon: "reset",
									label: "Reset this instance",
									hint: "Use the component values",
								}}
							/>
						</Menu.Item>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}
