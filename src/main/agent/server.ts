import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { AGENT_MCP_PATH, AGENT_PAGE_PATH } from "../../shared/agent";
import { answerMcp } from "./mcp";
import type { CallPage } from "./pending";
import type { WebPage } from "./webPage";

const MAX_BODY = 128 * 1024 * 1024;
const LOOPBACK = new Set(["127.0.0.1", "localhost"]);
const PAGE_ORIGIN =
	/^(?:http:\/\/(?:localhost|127\.0\.0\.1):(?:5173|4173)|https:\/\/aleqsio\.github\.io)$/u;

class BodyError extends Error {}

function send(response: ServerResponse, status: number, body?: unknown): void {
	if (body === undefined) {
		response.writeHead(status).end();
		return;
	}
	response.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
}

async function bodyOf(request: IncomingMessage): Promise<unknown> {
	const chunks: Buffer[] = [];
	let size = 0;
	for await (const chunk of request) {
		if (!(chunk instanceof Uint8Array)) {
			throw new BodyError("The request is not bytes.");
		}
		const bytes = Buffer.from(chunk);
		size += bytes.length;
		if (size > MAX_BODY) {
			throw new BodyError("The request is too large.");
		}
		chunks.push(bytes);
	}
	try {
		return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
	} catch {
		throw new BodyError("The request is not JSON.");
	}
}

function hostName(request: IncomingMessage): string {
	return (request.headers.host ?? "").replace(/:\d+$/u, "");
}

async function serveMcp(
	request: IncomingMessage,
	response: ServerResponse,
	call: CallPage,
): Promise<void> {
	if (request.headers.origin !== undefined) {
		send(response, 403, { error: "A browser cannot call the MCP endpoint." });
		return;
	}
	if (request.method !== "POST") {
		response.setHeader("Allow", "POST");
		send(response, 405);
		return;
	}
	const answer = await answerMcp(await bodyOf(request), call);
	send(response, answer === null ? 202 : 200, answer ?? undefined);
}

async function servePage(
	request: IncomingMessage,
	response: ServerResponse,
	page: WebPage,
): Promise<void> {
	const { origin } = request.headers;
	if (origin === undefined || !PAGE_ORIGIN.test(origin)) {
		send(response, 403);
		return;
	}
	response.setHeader("Access-Control-Allow-Origin", origin);
	response.setHeader("Access-Control-Allow-Headers", "Content-Type");
	response.setHeader("Vary", "Origin");
	if (request.method === "GET") {
		page.poll(response);
		return;
	}
	if (request.method === "POST") {
		page.reply(await bodyOf(request));
	}
	send(response, 204);
}

async function route(
	request: IncomingMessage,
	response: ServerResponse,
	call: CallPage,
	page: WebPage | null,
): Promise<void> {
	const path = (request.url ?? "").split("?")[0];
	if (!LOOPBACK.has(hostName(request))) {
		send(response, 403);
	} else if (path === AGENT_MCP_PATH) {
		await serveMcp(request, response, call);
	} else if (path === AGENT_PAGE_PATH && page !== null) {
		await servePage(request, response, page);
	} else {
		send(response, 404);
	}
}

export function agentServer(call: CallPage, page: WebPage | null): Server {
	return createServer((request, response) => {
		route(request, response, call, page).catch((error: unknown) => {
			const status = error instanceof BodyError ? 400 : 500;
			send(response, status, { error: error instanceof Error ? error.message : String(error) });
		});
	});
}
