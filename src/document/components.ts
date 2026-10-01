import { LoroMap } from "loro-crdt";
import type { LoroDoc, TreeID } from "loro-crdt";
import { componentOf } from "./component";
import type { Component, ComponentSource, PropSpec } from "./component";
import { notify, subscribeTo } from "./listeners";
import type { Unsubscribe } from "./listeners";
import { isNodeId } from "./path";
import { readString } from "./read";
import type { FieldSource } from "./read";
import type { Declared } from "./resolve";
import { Scope } from "./scope";
import { DOCUMENT_SCOPE, newVariableId } from "./variable";
import type { Variable } from "./variable";

const SOURCES = "sources";
const COMPONENTS = "components";
const DOCUMENT_MAP = "scope";
const SCOPE = "scope";

type ComponentBody = { kind: "html"; source: string } | { kind: "layers"; root: TreeID };

export interface ComponentEntry {
	id: string;
	name: string;
	body: ComponentBody;
}

export type Keep = (message: string, write: () => void) => void;

export interface ComponentsView {
	entries: readonly ComponentEntry[];
	entry: (id: string) => ComponentEntry | null;
	declared: (variable: string) => Declared | null;
	variables: (owner: string) => readonly Variable[];
}

export type HtmlImport = readonly [address: string, source: ComponentSource];

function bodyOf(map: FieldSource): ComponentBody | null {
	const kind = readString(map, "kind", "");
	const source = readString(map, "source", "");
	const root = readString(map, "root", "");
	if (kind === "html" && source !== "") {
		return { kind, source };
	}
	return kind === "layers" && isNodeId(root) ? { kind, root } : null;
}

function variableOfSpec(spec: PropSpec, held: Variable | undefined): Variable {
	const options = spec.kind === "choice" ? spec.options : [];
	const type = spec.kind === "choice" ? "choice" : spec.kind;
	return {
		id: held?.id ?? newVariableId(),
		name: spec.name,
		type,
		initial: spec.initial,
		options,
	};
}

export class ComponentStore {
	readonly #doc: LoroDoc;
	readonly #keep: Keep;
	readonly #listeners = new Set<() => void>();
	readonly #scopes = new Map<string, Scope>();
	readonly #sources = new Map<string, Component | null>();
	#entries: readonly ComponentEntry[] | null = null;
	#declared: ReadonlyMap<string, Declared> | null = null;
	#view: ComponentsView | null = null;

	constructor(doc: LoroDoc, keep: Keep) {
		this.#doc = doc;
		this.#keep = keep;
		for (const name of [SOURCES, COMPONENTS, DOCUMENT_MAP]) {
			doc.getMap(name).subscribe(() => {
				this.forget();
			});
		}
	}

	entries(): readonly ComponentEntry[] {
		this.#entries ??= this.#readEntries();
		return this.#entries;
	}

	view(): ComponentsView {
		this.#view ??= {
			entries: this.entries(),
			entry: (id) => this.entry(id),
			declared: (variable) => this.declared(variable),
			variables: (owner) => this.scope(owner).variables(),
		};
		return this.#view;
	}

	entry(id: string): ComponentEntry | null {
		return this.entries().find((entry) => entry.id === id) ?? null;
	}

	source(address: string): Component | null {
		const cached = this.#sources.get(address);
		if (cached !== undefined) {
			return cached;
		}
		const component = componentOf(address, this.#doc.getMap(SOURCES).get(address));
		this.#sources.set(address, component);
		return component;
	}

	scope(owner: string): Scope {
		const cached = this.#scopes.get(owner);
		const map = this.#scopeMap(owner);
		if (cached !== undefined && (map === null || cached.isOn(map))) {
			return cached;
		}
		const scope = new Scope(map ?? new LoroMap(), () => {
			this.forget();
		});
		this.#scopes.set(owner, scope);
		return scope;
	}

	declared(variable: string): Declared | null {
		this.#declared ??= this.#readDeclared();
		return this.#declared.get(variable) ?? null;
	}

	importHtml(imports: readonly HtmlImport[]): void {
		if (imports.length === 0) {
			return;
		}
		this.#keep("import components", () => {
			for (const [address, source] of imports) {
				this.#importOne(address, source);
			}
		});
	}

	addLayers(id: string, name: string, root: TreeID): void {
		const map = this.#doc.getMap(COMPONENTS).ensureMergeableMap(id);
		map.set("name", name);
		map.set("kind", "layers");
		map.set("root", root);
		map.ensureMergeableMap(SCOPE);
		this.forget();
	}

	adoptHtml(id: string, imported: HtmlImport, fill: (scope: Scope) => void): void {
		this.#keep("adopt components", () => {
			this.#writeHtml(id, imported);
			fill(this.scope(id));
		});
	}

	subscribe(listener: () => void): Unsubscribe {
		return subscribeTo(this.#listeners, listener);
	}

	forget(): void {
		this.#entries = null;
		this.#declared = null;
		this.#view = null;
		this.#sources.clear();
		notify(this.#listeners);
	}

	#importOne(address: string, source: ComponentSource): void {
		const held = this.entries().find(
			(entry) => entry.name === source.name && entry.body.kind === "html",
		);
		const id = held?.id ?? newVariableId();
		this.#writeHtml(id, [address, source]);
		this.#syncProps(this.scope(id), source.props);
	}

	#writeHtml(id: string, [address, source]: HtmlImport): void {
		const sources = this.#doc.getMap(SOURCES);
		if (sources.get(address) === undefined) {
			sources.set(address, source);
		}
		const map = this.#doc.getMap(COMPONENTS).ensureMergeableMap(id);
		map.set("name", source.name);
		map.set("kind", "html");
		map.set("source", address);
		map.ensureMergeableMap(SCOPE);
	}

	#syncProps(scope: Scope, specs: readonly PropSpec[]): void {
		const held = new Map(scope.variables().map((variable) => [variable.name, variable]));
		for (const spec of specs) {
			scope.put(variableOfSpec(spec, held.get(spec.name)));
			held.delete(spec.name);
		}
		for (const stale of held.values()) {
			scope.remove(stale.id);
		}
	}

	#scopeMap(owner: string): LoroMap | null {
		if (owner === DOCUMENT_SCOPE) {
			return this.#doc.getMap(DOCUMENT_MAP);
		}
		const entry: unknown = this.#doc.getMap(COMPONENTS).get(owner);
		const scope: unknown = entry instanceof LoroMap ? entry.get(SCOPE) : null;
		return scope instanceof LoroMap ? scope : null;
	}

	#readEntries(): readonly ComponentEntry[] {
		const components = this.#doc.getMap(COMPONENTS);
		return components
			.keys()
			.flatMap((id: unknown): ComponentEntry[] => {
				const map: unknown = typeof id === "string" ? components.get(id) : null;
				const body = map instanceof LoroMap ? bodyOf(map) : null;
				return typeof id !== "string" || !(map instanceof LoroMap) || body === null
					? []
					: [{ id, name: readString(map, "name", ""), body }];
			})
			.toSorted((left, right) => left.name.localeCompare(right.name));
	}

	#readDeclared(): ReadonlyMap<string, Declared> {
		const declared = new Map<string, Declared>();
		for (const owner of [DOCUMENT_SCOPE, ...this.entries().map((entry) => entry.id)]) {
			for (const variable of this.scope(owner).variables()) {
				declared.set(variable.id, { variable, owner });
			}
		}
		return declared;
	}
}
