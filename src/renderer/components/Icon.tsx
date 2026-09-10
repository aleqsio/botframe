import type { ReactElement } from "react";

const PATHS = {
	artboard: "M8.5 3v18M15.5 3v18M3 8.5h18M3 15.5h18",
	ellipse: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z",
	hand: "M9 11V5a1.5 1.5 0 0 1 3 0v6M12 11V4a1.5 1.5 0 0 1 3 0v7M15 11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a5 5 0 0 1-4.4-2.6L6 14.6a1.5 1.5 0 0 1 2.6-1.5l.4.7M9 11V9.5a1.5 1.5 0 0 0-3 0V13",
	image:
		"M6 4.5h12A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5zM4.5 15.5 8.5 11.5l3 3 2.5-2.5 5.5 5.5M16.4 9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0z",
	rectangle: "M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
	select: "M6 3 6 19.5 10 15.5 12.8 21 15.4 19.8 12.7 14.6 18 14.2Z",
	text: "M4.5 5h15M12 5v14M8.5 19h7",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }): ReactElement {
	return (
		<svg aria-hidden="true" className="icon" focusable="false" viewBox="0 0 24 24">
			<path d={PATHS[name]} />
		</svg>
	);
}
