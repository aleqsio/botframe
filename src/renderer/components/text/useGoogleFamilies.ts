import { useEffect, useState } from "react";
import { googleFamilies } from "../../fonts/googleFonts";
import type { GoogleFamily } from "../../fonts/googleFonts";

const NONE: readonly GoogleFamily[] = [];

export function useGoogleFamilies(): readonly GoogleFamily[] {
	const [families, setFamilies] = useState(NONE);
	useEffect(() => {
		let live = true;
		const load = async (): Promise<void> => {
			const list = await googleFamilies();
			if (live) {
				setFamilies(list);
			}
		};
		void load();
		return () => {
			live = false;
		};
	}, []);
	return families;
}
