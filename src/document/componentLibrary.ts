import type { LoroDoc, LoroMap } from "loro-crdt";
import { componentOf } from "./component";
import type { Component, ComponentSource } from "./component";
import { notify, subscribeTo } from "./listeners";
import { readString } from "./read";

const COMPONENTS = "components";
const CATALOG = "catalog";

export type Sources = Readonly<Record<string, ComponentSource>>;

export type Keep = (message: string, write: () => void) => void;

export interface CatalogEntry {
	name: string;
	id: string;
}

export class ComponentLibrary {
	readonly #doc: LoroDoc;
	readonly #keepWrite: Keep;
	readonly #cache = new Map<string, Component | null>();
	readonly #listeners = new Set<() => void>();
	#catalog: readonly CatalogEntry[] | null = null;

	constructor(doc: LoroDoc, keep: Keep) {
		this.#doc = doc;
		this.#keepWrite = keep;
		const refresh = (): void => {
			this.#cache.clear();
			this.#catalog = null;
			notify(this.#listeners);
		};
		this.#components().subscribe(refresh);
		this.#names().subscribe(refresh);
	}

	add(sources: Sources): void {
		this.#keep(sources, "import components", () => true);
	}

	adopt(sources: Sources): void {
		this.#keep(sources, "adopt components", (name) => readString(this.#names(), name, "") === "");
	}

	component(id: string): Component | null {
		const cached = this.#cache.get(id);
		if (cached !== undefined) {
			return cached;
		}
		const component = componentOf(id, this.#components().get(id));
		this.#cache.set(id, component);
		return component;
	}

	catalog(): readonly CatalogEntry[] {
		this.#catalog ??= this.#names()
			.keys()
			.filter((key: unknown): key is string => typeof key === "string")
			.flatMap((name): CatalogEntry[] => {
				const id = readString(this.#names(), name, "");
				return id === "" ? [] : [{ name, id }];
			})
			.toSorted((left, right) => left.name.localeCompare(right.name));
		return this.#catalog;
	}

	sourcesOf(ids: Iterable<string>): Sources {
		const sources: Record<string, ComponentSource> = {};
		for (const id of ids) {
			const component = this.component(id);
			if (component !== null) {
				const { name, html, css, props } = component;
				sources[id] = { name, html, css, props };
			}
		}
		return sources;
	}

	subscribe(listener: () => void): () => void {
		return subscribeTo(this.#listeners, listener);
	}

	#keep(sources: Sources, message: string, names: (name: string) => boolean): void {
		const entries = Object.entries(sources);
		if (entries.length === 0) {
			return;
		}
		this.#keepWrite(message, () => {
			for (const [id, source] of entries) {
				this.#store(id, source, names(source.name));
			}
		});
	}

	#store(id: string, source: ComponentSource, named: boolean): void {
		if (this.#components().get(id) === undefined) {
			this.#components().set(id, source);
		}
		if (named && readString(this.#names(), source.name, "") !== id) {
			this.#names().set(source.name, id);
		}
	}

	#components(): LoroMap {
		return this.#doc.getMap(COMPONENTS);
	}

	#names(): LoroMap {
		return this.#doc.getMap(CATALOG);
	}
}
