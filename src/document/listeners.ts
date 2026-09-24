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
