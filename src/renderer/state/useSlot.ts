import { useCallback, useSyncExternalStore } from "react";
import type { Slot } from "./slot";

export function useSlot<T>(slot: Slot<T>): T {
	return useSyncExternalStore(
		useCallback((listener: () => void) => slot.subscribe(listener), [slot]),
		useCallback(() => slot.get(), [slot]),
	);
}

export function usePicked<T, V>(slot: Slot<T>, pick: (value: T) => V): V {
	return useSyncExternalStore(
		useCallback((listener: () => void) => slot.subscribe(listener), [slot]),
		useCallback(() => pick(slot.get()), [slot, pick]),
	);
}
