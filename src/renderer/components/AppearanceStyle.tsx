import type { ReactElement } from "react";
import { appearanceCss } from "../state/appearance";
import type { Appearance } from "../state/appearance";
import type { Slot } from "../state/slot";
import { useSlot } from "../state/useSlot";

export function AppearanceStyle({ appearance }: { appearance: Slot<Appearance> }): ReactElement {
	const value = useSlot(appearance);
	return <style>{appearanceCss(value)}</style>;
}
