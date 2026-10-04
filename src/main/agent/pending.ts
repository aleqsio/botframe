import type { AgentCall, AgentReply } from "../../shared/agent";

export type CallPage = (tool: string, args: unknown) => Promise<unknown>;

interface Waiter {
	resolve: (result: unknown) => void;
	reject: (error: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

const ANSWER_MS = 60_000;

function fieldsOf(value: unknown): Partial<Record<keyof AgentReply | "result" | "error", unknown>> {
	return typeof value === "object" && value !== null ? value : {};
}

function replyOf(value: unknown): AgentReply | null {
	const { id, ok, result, error } = fieldsOf(value);
	if (typeof id !== "number") {
		return null;
	}
	if (ok === true) {
		return { id, ok, result };
	}
	return ok === false && typeof error === "string" ? { id, ok, error } : null;
}

export class Pending {
	readonly #send: (call: AgentCall) => void;
	readonly #waiters = new Map<number, Waiter>();
	#next = 1;

	constructor(send: (call: AgentCall) => void) {
		this.#send = send;
	}

	call(tool: string, args: unknown): Promise<unknown> {
		const id = this.#next;
		this.#next += 1;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.#waiters.delete(id);
				reject(new Error("botframe did not answer in 60 seconds."));
			}, ANSWER_MS);
			this.#waiters.set(id, { resolve, reject, timer });
			try {
				this.#send({ id, tool, args });
			} catch (error) {
				this.#finish(id)?.reject(error instanceof Error ? error : new Error(String(error)));
			}
		});
	}

	waits(id: number): boolean {
		return this.#waiters.has(id);
	}

	settle(value: unknown): void {
		const reply = replyOf(value);
		const waiter = reply === null ? undefined : this.#finish(reply.id);
		if (reply === null || waiter === undefined) {
			return;
		}
		if (reply.ok) {
			waiter.resolve(reply.result);
			return;
		}
		waiter.reject(new Error(reply.error));
	}

	#finish(id: number): Waiter | undefined {
		const waiter = this.#waiters.get(id);
		this.#waiters.delete(id);
		if (waiter !== undefined) {
			clearTimeout(waiter.timer);
		}
		return waiter;
	}
}
