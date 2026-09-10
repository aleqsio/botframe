export class Slot<T> {
	readonly #listeners = new Set<() => void>();
	#value: T;

	constructor(initial: T) {
		this.#value = initial;
	}

	get(): T {
		return this.#value;
	}

	set(next: T): void {
		if (Object.is(next, this.#value)) {
			return;
		}
		this.#value = next;
		for (const listener of this.#listeners) {
			listener();
		}
	}

	subscribe(listener: () => void): () => void {
		this.#listeners.add(listener);
		return () => {
			this.#listeners.delete(listener);
		};
	}
}
