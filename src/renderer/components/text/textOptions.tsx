import type { TextStyle } from "../../../document/text";
import { Icon } from "../Icon";
import type { SegmentOption } from "../layout/Segmented";

export const ALIGN_OPTIONS: readonly SegmentOption<TextStyle["textAlign"]>[] = [
	{ value: "left", label: "Left", icon: <Icon name="textLeft" /> },
	{ value: "center", label: "Center", icon: <Icon name="textCenter" /> },
	{ value: "right", label: "Right", icon: <Icon name="textRight" /> },
	{ value: "justify", label: "Justify", icon: <Icon name="textJustify" /> },
];

export const VERTICAL_OPTIONS: readonly SegmentOption<TextStyle["verticalAlign"]>[] = [
	{ value: "top", label: "Top", icon: <Icon name="alignTop" /> },
	{ value: "middle", label: "Middle", icon: <Icon name="alignCenterY" /> },
	{ value: "bottom", label: "Bottom", icon: <Icon name="alignBottom" /> },
];

export const DECORATION_OPTIONS: readonly SegmentOption<TextStyle["decoration"]>[] = [
	{ value: "none", label: "None" },
	{ value: "underline", label: "Underline", icon: <Icon name="underline" /> },
	{ value: "line-through", label: "Strike", icon: <Icon name="strike" /> },
];

export const CASE_OPTIONS: readonly SegmentOption<TextStyle["textCase"]>[] = [
	{ value: "none", label: "As typed" },
	{ value: "uppercase", label: "AB" },
	{ value: "lowercase", label: "ab" },
	{ value: "capitalize", label: "Ab" },
];
