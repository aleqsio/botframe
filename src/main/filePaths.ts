import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { app } from "electron";

const STORE_NAME = "files.json";

const paths = new Map<string, string>();
let stored: Promise<void> = Promise.resolve();

function storePath(): string {
	return join(app.getPath("userData"), STORE_NAME);
}

function entriesOf(value: unknown): [string, string][] {
	if (typeof value !== "object" || value === null) {
		return [];
	}
	return Object.entries(value).filter(
		(entry): entry is [string, string] => typeof entry[1] === "string",
	);
}

async function readPaths(): Promise<void> {
	const value: unknown = JSON.parse(await readFile(storePath(), "utf8"));
	for (const [token, path] of entriesOf(value)) {
		paths.set(token, path);
	}
}

export async function loadPaths(): Promise<void> {
	try {
		await readPaths();
	} catch {
		paths.clear();
	}
}

function storePaths(): void {
	const text = JSON.stringify(Object.fromEntries(paths));
	stored = stored.then(() => writeFile(storePath(), text)).catch(() => {});
}

export function pathOf(token: unknown): string | undefined {
	return typeof token === "string" ? paths.get(token) : undefined;
}

export function setPath(token: string, path: string): void {
	for (const [held, heldPath] of paths) {
		if (heldPath === path && held !== token) {
			paths.delete(held);
		}
	}
	paths.set(token, path);
	storePaths();
}

export function tokenOf(path: string): string {
	for (const [token, held] of paths) {
		if (held === path) {
			return token;
		}
	}
	const token = randomUUID();
	setPath(token, path);
	return token;
}
