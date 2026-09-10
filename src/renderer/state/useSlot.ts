import { useCallback, useSyncExternalStore } from "react";
import type { Slot } from "./slot";

export function useSlot<T>(slot: Slot<T>): T {
	return useSyncExternalStore(
		useCallback((listener: () => void) => slot.subscribe(listener), [slot]),
		useCallback(() => slot.get(), [slot]),
	);
}
