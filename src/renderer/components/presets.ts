import type { Size } from "./layerFields";

export interface FramePreset {
	name: string;
	width: number;
	height: number;
}

export interface PresetGroup {
	name: string;
	presets: readonly FramePreset[];
}

export const CUSTOM_PRESET = "Custom";

export const PRESET_GROUPS: readonly PresetGroup[] = [
	{
		name: "Phone",
		presets: [
			{ name: "iPhone 18", width: 402, height: 874 },
			{ name: "Android", width: 412, height: 915 },
		],
	},
	{
		name: "Tablet",
		presets: [{ name: "iPad", width: 834, height: 1194 }],
	},
	{
		name: "Desktop",
		presets: [
			{ name: "Desktop", width: 1440, height: 1024 },
			{ name: "Desktop large", width: 1920, height: 1200 },
		],
	},
	{
		name: "Presentation",
		presets: [
			{ name: "Slide 16:9", width: 1920, height: 1080 },
			{ name: "Slide 4:3", width: 1024, height: 768 },
		],
	},
	{
		name: "Social",
		presets: [
			{ name: "Instagram post", width: 1080, height: 1080 },
			{ name: "Instagram story", width: 1080, height: 1920 },
		],
	},
	{
		name: "Paper",
		presets: [
			{ name: "A4", width: 794, height: 1123 },
			{ name: "Letter", width: 816, height: 1056 },
		],
	},
];

const PRESETS: readonly FramePreset[] = PRESET_GROUPS.flatMap((group) => group.presets);

export function presetNamed(name: string): FramePreset | null {
	return PRESETS.find((preset) => preset.name === name) ?? null;
}

export function presetNameFor(width: number, height: number): string {
	const match = PRESETS.find((preset) => preset.width === width && preset.height === height);
	return match?.name ?? CUSTOM_PRESET;
}

export function thumbnailOf(size: Size, box: number): Size {
	const scale = box / Math.max(size.width, size.height);
	return {
		width: Math.max(1, Math.round(size.width * scale)),
		height: Math.max(1, Math.round(size.height * scale)),
	};
}
