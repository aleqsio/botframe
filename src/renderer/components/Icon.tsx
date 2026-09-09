import type { ReactElement } from "react";

const PATHS = {
	ellipse: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z",
	frame: "M8.5 3v18M15.5 3v18M3 8.5h18M3 15.5h18",
	image:
		"M6 4.5h12A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5zM4.5 15.5 8.5 11.5l3 3 2.5-2.5 5.5 5.5M16.4 9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0z",
	rectangle: "M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
	text: "M4.5 5h15M12 5v14M8.5 19h7",
	zoom: "M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.8 15.8 20 20",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }): ReactElement {
	return (
		<svg aria-hidden="true" className="icon" focusable="false" viewBox="0 0 24 24">
			<path d={PATHS[name]} />
		</svg>
	);
}
