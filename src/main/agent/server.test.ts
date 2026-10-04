import { request } from "node:http";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { AGENT_TOOLS } from "../../shared/agent";
import { agentServer } from "./server";
import { WebPage } from "./webPage";

const servers: Server[] = [];

async function started(server: Server): Promise<string> {
	servers.push(server);
	await new Promise<void>((resolve) => {
		server.listen(0, "127.0.0.1", resolve);
	});
	const address = server.address();
	if (address === null || typeof address === "string") {
		throw new Error("the server has no port");
	}
	return `http://127.0.0.1:${address.port}`;
}

afterEach(() => {
	for (const server of servers.splice(0)) {
		server.closeAllConnections();
		server.close();
	}
});

function rpc(method: string, params: unknown = {}): RequestInit {
	return {
		method: "POST",
		headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
		body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
	};
}

function json(response: Response): Promise<unknown> {
	return response.json();
}

function statusFor(base: string, host: string): Promise<number | undefined> {
	return new Promise((resolve, reject) => {
		const sent = request(`${base}/mcp`, { method: "POST", headers: { Host: host } }, (answer) => {
			answer.resume();
			resolve(answer.statusCode);
		});
		sent.on("error", reject);
		sent.end("{}");
	});
}

describe("agent server", () => {
	it("answers the MCP handshake and lists the tools", async () => {
		const base = await started(agentServer(() => Promise.resolve(null), null));
		const init = await fetch(`${base}/mcp`, rpc("initialize", { protocolVersion: "2025-06-18" }));
		expect(await json(init)).toMatchObject({
			id: 1,
			result: { protocolVersion: "2025-06-18", capabilities: { tools: {} } },
		});
		const listed = await json(await fetch(`${base}/mcp`, rpc("tools/list")));
		expect(listed).toMatchObject({ result: { tools: AGENT_TOOLS } });
	});

	it("accepts a notification with no body in the answer", async () => {
		const base = await started(agentServer(() => Promise.resolve(null), null));
		const response = await fetch(`${base}/mcp`, {
			method: "POST",
			body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
		});
		expect(response.status).toBe(202);
	});

	it("sends a tool call to the page and gives its result as text", async () => {
		const calls: unknown[] = [];
		const base = await started(
			agentServer((tool, args) => {
				calls.push([tool, args]);
				return Promise.resolve({ ids: ["1@1"] });
			}, null),
		);
		const params = { name: "get_outline", arguments: { document: "a" } };
		const answer = await json(await fetch(`${base}/mcp`, rpc("tools/call", params)));
		expect(calls).toEqual([["get_outline", { document: "a" }]]);
		expect(answer).toMatchObject({
			result: { isError: false, content: [{ type: "text", text: '{"ids":["1@1"]}' }] },
		});
	});

	it("gives a tool error as a result, and an unknown tool as an error", async () => {
		const base = await started(agentServer(() => Promise.reject(new Error("refused")), null));
		const failed = await json(await fetch(`${base}/mcp`, rpc("tools/call", { name: "undo" })));
		expect(failed).toMatchObject({ result: { isError: true, content: [{ text: "refused" }] } });
		const unknown = await json(await fetch(`${base}/mcp`, rpc("tools/call", { name: "nope" })));
		expect(unknown).toMatchObject({ error: { code: -32_602 } });
	});

	it("refuses a browser on the MCP endpoint and a different host name", async () => {
		const base = await started(agentServer(() => Promise.resolve(null), null));
		const fromPage = await fetch(`${base}/mcp`, {
			...rpc("ping"),
			headers: { Origin: "https://example.com" },
		});
		expect(fromPage.status).toBe(403);
		expect(await statusFor(base, "evil.test")).toBe(403);
		expect(await statusFor(base, "localhost:7341")).toBe(202);
	});

	it("carries a call to a page that polls, and its reply back", async () => {
		const page = new WebPage();
		const base = await started(agentServer((tool, args) => page.call(tool, args), page));
		const headers = { Origin: "http://localhost:5173" };
		const poll = fetch(`${base}/page`, { headers });
		await new Promise((resolve) => {
			setTimeout(resolve, 50);
		});
		const answer = fetch(`${base}/mcp`, rpc("tools/call", { name: "undo", arguments: {} }));
		const call = await json(await poll);
		expect(call).toEqual({ id: 1, tool: "undo", args: {} });
		const replied = await fetch(`${base}/page`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({ id: 1, ok: true, result: { done: true } }),
		});
		expect(replied.status).toBe(204);
		expect(await json(await answer)).toMatchObject({ result: { isError: false } });
	});

	it("refuses a page from a different site, and a call with no page", async () => {
		const page = new WebPage();
		const base = await started(agentServer((tool, args) => page.call(tool, args), page));
		const poll = await fetch(`${base}/page`, { headers: { Origin: "https://example.com" } });
		expect(poll.status).toBe(403);
		const otherApp = await fetch(`${base}/page`, { headers: { Origin: "http://localhost:3000" } });
		expect(otherApp.status).toBe(403);
		const answer = await json(await fetch(`${base}/mcp`, rpc("tools/call", { name: "undo" })));
		expect(answer).toMatchObject({ result: { isError: true } });
	});
});
