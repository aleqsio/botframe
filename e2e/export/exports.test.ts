import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { EXAMPLES } from "../fixtures/export/index";
import { startSession } from "./build";
import type { Session } from "./build";
import { checkedExample } from "./check";
import { writeReport } from "./report";
import type { Row } from "./report";

const FOLDER = resolve("test-results", "export-check");

let session: Session | null = null;
const rows: Row[] = [];

function opened(): Session {
	if (session === null) {
		throw new Error("botframe did not start.");
	}
	return session;
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
	test.setTimeout(120_000);
	await mkdir(FOLDER, { recursive: true });
	session = await startSession(FOLDER);
});

test.afterAll(async () => {
	const path = await writeReport(FOLDER, rows);
	process.stdout.write(`The export contact sheet is at ${path}\n`);
	await session?.app.close();
});

for (const example of EXAMPLES) {
	test(`each export of ${example.name} matches the render`, async () => {
		test.setTimeout(300_000);
		const { reader, ids } = opened();
		const row = await checkedExample(reader, FOLDER, example, ids);
		rows.push(row);
		for (const cell of row.cells) {
			expect.soft(cell.problems, `${example.name} as ${cell.option}`).toEqual([]);
		}
	});
}
