export type Unsubscribe = () => void;

export function subscribeTo(listeners: Set<() => void>, listener: () => void): Unsubscribe {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function notify(listeners: Iterable<() => void>): void {
	for (const listener of listeners) {
		listener();
	}
}

export function refreshed<T>(cached: readonly T[], next: readonly T[]): readonly T[] {
	const same = cached.length === next.length && cached.every((item, index) => item === next[index]);
	return same ? cached : next;
}
