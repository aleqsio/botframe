import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import type { IconName } from "../components/Icon";
import type { UserState } from "../state/userState";
import { heldWithAccelerator, never } from "./command";
import type { CommandGroup, EditCommand } from "./command";
import type { KeyStroke } from "./layerCommand";
import {
	alignSelection,
	canAim,
	canFlip,
	canFit,
	canSpread,
	fitToChildren,
	flipSelection,
	hasSelection,
	selectedLayers,
	spreadSelection,
	swapSelection,
	turnSelection,
} from "./layoutWrite";
import type { AimSpec, AxisSpec, TurnSpec } from "./layoutWrite";

type Ready = (doc: DesignDocument, layers: readonly Layer[]) => boolean;

export interface LayoutAction extends EditCommand {
	icon: IconName;
	ready: Ready;
	needs: string;
}

interface ActionRow {
	id: string;
	label: string;
	icon: IconName;
	key: string;
	group: CommandGroup;
}

const SHIFT_PREFIX = "CmdOrCtrl+Shift+";
const QUARTER_TURN = 90;

const ARROW_OF: Readonly<Record<string, string>> = {
	Left: "ArrowLeft",
	Right: "ArrowRight",
	Up: "ArrowUp",
	Down: "ArrowDown",
};

const ALIGN_MESSAGE = "align layers";
const CENTER_MESSAGE = "center layers";
const SPREAD_MESSAGE = "distribute layers";
const FLIP_MESSAGE = "flip layers";
const TURN_MESSAGE = "turn layers";

const FREE_PARENT = "a frame that does not lay out its children";
const NEEDS_OF_SCOPE: Readonly<Record<AimSpec["scope"], string>> = {
	selection: `Select two or more layers, or a layer in ${FREE_PARENT}`,
	parent: `Select a layer in ${FREE_PARENT}`,
	bounds: "Select a layer that can move",
};
const SPREAD_NEEDS = "Select three or more layers that can move";
const FIT_NEEDS = "Select one frame that has children and no auto layout";
const SELECTION_NEEDS = "Select a layer";
const FLIP_NEEDS = "Select a layer that looks different when it is mirrored";

function shiftStroke(key: string): (stroke: KeyStroke) => boolean {
	if (key === "") {
		return never;
	}
	const wanted = (ARROW_OF[key] ?? key).toLowerCase();
	return (stroke) =>
		heldWithAccelerator(stroke) && stroke.shiftKey && stroke.key.toLowerCase() === wanted;
}

function turnStroke(counter: boolean): (stroke: KeyStroke) => boolean {
	return (stroke) =>
		heldWithAccelerator(stroke) &&
		stroke.shiftKey === counter &&
		(stroke.key === "]" || stroke.key === "}");
}

function actionOf(
	row: ActionRow,
	ready: Ready,
	apply: EditCommand["apply"],
	needs: string,
): LayoutAction {
	return {
		id: row.id,
		label: row.label,
		icon: row.icon,
		group: row.group,
		accelerator: row.key === "" ? "" : SHIFT_PREFIX + row.key,
		matches: shiftStroke(row.key),
		ready,
		needs,
		enabled: (doc, user) => ready(doc, selectedLayers(doc, user)),
		apply,
	};
}

interface AimRow extends ActionRow {
	spec: AimSpec;
}

type Aiming = (doc: DesignDocument, user: UserState, spec: AimSpec) => boolean;

function aimAction(row: AimRow, aim: Aiming): LayoutAction {
	return actionOf(
		row,
		(doc, layers) => canAim(doc, layers, row.spec),
		(doc, user) => aim(doc, user, row.spec),
		NEEDS_OF_SCOPE[row.spec.scope],
	);
}

interface SpreadRow extends ActionRow {
	spec: AxisSpec;
}

function spreadAction(row: SpreadRow): LayoutAction {
	return actionOf(
		row,
		(doc, layers) => canSpread(doc, layers, row.spec),
		(doc, user) => spreadSelection(doc, user, row.spec),
		SPREAD_NEEDS,
	);
}

interface TurnRow extends ActionRow {
	spec: TurnSpec;
	counter: boolean;
}

function turnAction(row: TurnRow): LayoutAction {
	return {
		...actionOf(
			row,
			hasSelection,
			(doc, user) => turnSelection(doc, user, row.spec),
			SELECTION_NEEDS,
		),
		accelerator: row.counter ? "CmdOrCtrl+Shift+]" : "CmdOrCtrl+]",
		matches: turnStroke(row.counter),
	};
}

function aimSpec(axes: AimSpec["axes"], at: number, scope: AimSpec["scope"]): AimSpec {
	return { axes, at, scope, message: scope === "parent" ? CENTER_MESSAGE : ALIGN_MESSAGE };
}

function flipSpec(axes: AimSpec["axes"]): AimSpec {
	return { axes, at: 0.5, scope: "bounds", message: FLIP_MESSAGE };
}

const ALIGNS: readonly AimRow[] = [
	{
		id: "alignLeft",
		label: "Align left",
		icon: "alignLeft",
		key: "Left",
		group: "align",
		spec: aimSpec(["x"], 0, "selection"),
	},
	{
		id: "alignCenterX",
		label: "Align horizontal centers",
		icon: "alignCenterX",
		key: "H",
		group: "align",
		spec: aimSpec(["x"], 0.5, "selection"),
	},
	{
		id: "alignRight",
		label: "Align right",
		icon: "alignRight",
		key: "Right",
		group: "align",
		spec: aimSpec(["x"], 1, "selection"),
	},
	{
		id: "alignTop",
		label: "Align top",
		icon: "alignTop",
		key: "Up",
		group: "align",
		spec: aimSpec(["y"], 0, "selection"),
	},
	{
		id: "alignCenterY",
		label: "Align vertical centers",
		icon: "alignCenterY",
		key: "M",
		group: "align",
		spec: aimSpec(["y"], 0.5, "selection"),
	},
	{
		id: "alignBottom",
		label: "Align bottom",
		icon: "alignBottom",
		key: "Down",
		group: "align",
		spec: aimSpec(["y"], 1, "selection"),
	},
];

const SPREADS: readonly SpreadRow[] = [
	{
		id: "spreadX",
		label: "Distribute horizontally",
		icon: "spreadX",
		key: "J",
		group: "spread",
		spec: { axis: "x", message: SPREAD_MESSAGE },
	},
	{
		id: "spreadY",
		label: "Distribute vertically",
		icon: "spreadY",
		key: "K",
		group: "spread",
		spec: { axis: "y", message: SPREAD_MESSAGE },
	},
];

const CENTERS: readonly AimRow[] = [
	{
		id: "centerX",
		label: "Center horizontally in the parent",
		icon: "centerX",
		key: "",
		group: "place",
		spec: aimSpec(["x"], 0.5, "parent"),
	},
	{
		id: "centerY",
		label: "Center vertically in the parent",
		icon: "centerY",
		key: "",
		group: "place",
		spec: aimSpec(["y"], 0.5, "parent"),
	},
	{
		id: "centerBoth",
		label: "Center in the parent",
		icon: "centerBoth",
		key: "C",
		group: "place",
		spec: aimSpec(["x", "y"], 0.5, "parent"),
	},
];

const FLIPS: readonly AimRow[] = [
	{
		id: "flipX",
		label: "Flip horizontally",
		icon: "flipX",
		key: "F",
		group: "turn",
		spec: flipSpec(["x"]),
	},
	{
		id: "flipY",
		label: "Flip vertically",
		icon: "flipY",
		key: "G",
		group: "turn",
		spec: flipSpec(["y"]),
	},
];

const TURNS: readonly TurnRow[] = [
	{
		id: "turnRight",
		label: "Rotate 90° right",
		icon: "turnCw",
		key: "",
		group: "turn",
		counter: false,
		spec: { degrees: QUARTER_TURN, message: TURN_MESSAGE },
	},
	{
		id: "turnLeft",
		label: "Rotate 90° left",
		icon: "turnCcw",
		key: "",
		group: "turn",
		counter: true,
		spec: { degrees: -QUARTER_TURN, message: TURN_MESSAGE },
	},
];

const FIT: ActionRow = {
	id: "sizeToFit",
	label: "Size to fit",
	icon: "fit",
	key: "A",
	group: "place",
};

const SWAP: ActionRow = {
	id: "swapSize",
	label: "Swap width and height",
	icon: "swap",
	key: "X",
	group: "turn",
};

export const LAYOUT_ACTIONS: readonly LayoutAction[] = [
	...ALIGNS.map((row) => aimAction(row, alignSelection)),
	...SPREADS.map((row) => spreadAction(row)),
	...CENTERS.map((row) => aimAction(row, alignSelection)),
	actionOf(FIT, canFit, (doc, user) => fitToChildren(doc, user, "size to fit"), FIT_NEEDS),
	...FLIPS.map((row) =>
		actionOf(
			row,
			(doc, layers) => canFlip(doc, layers, row.spec),
			(doc, user) => flipSelection(doc, user, row.spec),
			FLIP_NEEDS,
		),
	),
	...TURNS.map((row) => turnAction(row)),
	actionOf(
		SWAP,
		hasSelection,
		(doc, user) => swapSelection(doc, user, "swap width and height"),
		SELECTION_NEEDS,
	),
];

export function actionTip(action: LayoutAction, ready: boolean, keys: string): string {
	const title = keys === "" ? action.label : `${action.label} (${keys})`;
	return ready ? title : `${title}\n${action.needs}`;
}
