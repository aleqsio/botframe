import type { ReactElement } from "react";

const PATHS = {
	alignBottom: "M4 20h16M6 6h4v10H6zM14 10h4v6h-4z",
	alignCenterX: "M12 3v18M7 6h10v4H7zM9 14h6v4H9z",
	alignCenterY: "M3 12h18M6 7h4v10H6zM14 9h4v6h-4z",
	alignLeft: "M4 4v16M8 6h10v4H8zM8 14h6v4H8z",
	alignRight: "M20 4v16M6 6h10v4H6zM10 14h6v4h-6z",
	alignTop: "M4 4h16M6 8h4v10H6zM14 8h4v6h-4z",
	centerBoth: "M12 3v18M3 12h18M8 8h8v8H8z",
	centerX: "M12 3v18M7 8h10v8H7z",
	centerY: "M3 12h18M8 7h8v10H8z",
	check: "m5 12.5 4.5 4.5L19 7.5",
	close: "M7 7l10 10M17 7 7 17",
	chevron: "m7 10 5 5 5-5",
	ellipse: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z",
	fit: "M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M8 8h8v8H8z",
	flipX: "M12 3v18M9 6 4 12l5 6zM15 6l5 6-5 6z",
	flipY: "M3 12h18M6 9 12 4l6 5zM6 15l6 5 6-5z",
	frame: "M8.5 3v18M15.5 3v18M3 8.5h18M3 15.5h18",
	hand: "M9 11V5a1.5 1.5 0 0 1 3 0v6M12 11V4a1.5 1.5 0 0 1 3 0v7M15 11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a5 5 0 0 1-4.4-2.6L6 14.6a1.5 1.5 0 0 1 2.6-1.5l.4.7M9 11V9.5a1.5 1.5 0 0 0-3 0V13",
	image:
		"M6 4.5h12A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5zM4.5 15.5 8.5 11.5l3 3 2.5-2.5 5.5 5.5M16.4 9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0z",
	layers: "m12 4 8 4-8 4-8-4 8-4zM4 12l8 4 8-4M4 16l8 4 8-4",
	minus: "M6 12h12",
	more: "M5 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0M11 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0M17 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0",
	plus: "M12 6v12M6 12h12",
	rectangle: "M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
	select: "M6 3 6 19.5 10 15.5 12.8 21 15.4 19.8 12.7 14.6 18 14.2Z",
	spreadX: "M4 4v16M20 4v16M7.5 8h3v8h-3zM13.5 8h3v8h-3z",
	spreadY: "M4 4h16M4 20h16M8 7.5h8v3H8zM8 13.5h8v3H8z",
	swap: "M8 4v16m0 0-3.5-3.5M8 20l3.5-3.5M16 20V4m0 0-3.5 3.5M16 4l3.5 3.5",
	text: "M4.5 5h15M12 5v14M8.5 19h7",
	turnCcw: "M5 9a8 8 0 1 1-1 4M5 9h4M5 9V5",
	turnCw: "M19 9a8 8 0 1 0 1 4M19 9h-4M19 9V5",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }): ReactElement {
	return (
		<svg aria-hidden="true" className="icon" focusable="false" viewBox="0 0 24 24">
			<path d={PATHS[name]} />
		</svg>
	);
}
