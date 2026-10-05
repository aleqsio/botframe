import type { Example, Fields, Step } from "../fixtures/export/example";
import { expect } from "@playwright/test";
import type { ElectronApplication } from "@playwright/test";
import { launchApp } from "../support";
import { fieldsOf, toolJson } from "./agent";
import { patternPng } from "./png";
import { openReader } from "./reader";
import type { Reader } from "./reader";

export type Ids = ReadonlyMap<string, string>;

function resolved(value: unknown, ids: Ids): unknown {
	if (typeof value === "string" && value.startsWith("$")) {
		const id = ids.get(value.slice(1));
		if (id === undefined) {
			throw new Error(`The fixture has no ${value}.`);
		}
		return id;
	}
	if (Array.isArray(value)) {
		return value.map((item) => resolved(item, ids));
	}
	if (typeof value === "object" && value !== null) {
		return resolvedFields(fieldsOf(value), ids);
	}
	return value;
}

function resolvedFields(fields: Fields, ids: Ids): Fields {
	return Object.fromEntries(
		Object.entries(fields).map(([key, item]) => [key, resolved(item, ids)]),
	);
}

function idOf(result: unknown): string {
	const { ids, component, asset, id } = fieldsOf(result);
	const first = Array.isArray(ids) ? (ids[0] as unknown) : (component ?? asset ?? id);
	if (typeof first !== "string") {
		throw new TypeError(`The tool gave no id: ${JSON.stringify(result)}`);
	}
	return first;
}

async function run(step: Step, ids: Map<string, string>): Promise<void> {
	const result = await toolJson(step.tool, resolvedFields(step.args, ids));
	if (step.as !== undefined) {
		ids.set(step.as, idOf(result));
	}
}

async function buildExample(example: Example, given: Ids): Promise<string> {
	const ids = new Map(given);
	await example.steps.reduce(
		(done: Promise<void>, step) => done.then(() => run(step, ids)),
		Promise.resolve(),
	);
	return idOf({ id: ids.get("root") });
}

async function storedFonts(): Promise<string> {
	return JSON.stringify(await toolJson("read_data", { path: ["fonts"] }));
}

export async function builtExample(example: Example, given: Ids): Promise<string> {
	const root = await buildExample(example, given);
	await Promise.all(
		example.fonts.map((family) => expect.poll(storedFonts, { timeout: 30_000 }).toContain(family)),
	);
	return root;
}

export interface Session {
	app: ElectronApplication;
	reader: Reader;
	ids: Ids;
}

export async function startSession(folder: string): Promise<Session> {
	const { app, window } = await launchApp(["--force-device-scale-factor=2"]);
	await expect(window.locator(".layer")).toHaveCount(1);
	const base64 = patternPng().toString("base64");
	const image = fieldsOf(await toolJson("add_asset", { base64, type: "image/png" }));
	const ids = new Map([["image", String(image["asset"])]]);
	return { app, reader: await openReader(app, folder), ids };
}
