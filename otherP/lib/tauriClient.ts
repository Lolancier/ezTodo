import { invoke } from "@tauri-apps/api/core";

export type Todo = {
	id: string;
	title: string;
	description: string;
	completed: boolean;
	important: boolean;
	dueDate: string | null;
	createdAt: string;
	completedAt?: string;
	priority: "low" | "medium" | "high";
	category: string;
	fromPlanId?: string;
};


export type Plan = {
	id: string;
	title: string;
	description: string;
	repeatCycle: "daily" | "weekly" | "monthly";
	planDays: number[];
	startTime: string;
	endTime: string;
	repeatCount: number | null;
	currentCount: number;
	cycleTargetCount: number;
	totalCompletedCount: number;
	lastResetDate: string;
	createdAt: string;
	category: string;
	active: boolean;
	important: boolean;
};

export async function todoCreate(input: Partial<Omit<Todo, "id" | "createdAt">> & { title: string }) {
	return await invoke<Todo>("todo_create", { input });
}

export async function todoList() {
	return await invoke<Todo[]>("todo_list");
}

export async function todoGet(id: string) {
	return await invoke<Todo>("todo_get", { id });
}

export async function todoUpdate(todo: Todo) {
	return await invoke<Todo>("todo_update", { todo });
}

export async function todoDelete(id: string) {
	return await invoke<boolean>("todo_delete", { id });
}

export async function planList() {
	return await invoke<Plan[]>("plan_list");
}

export async function planCreate(input: Omit<Plan, "id" | "createdAt" | "currentCount" | "totalCompletedCount" | "lastResetDate">) {
	// 后端会填充 id/createdAt/currentCount/totalCompletedCount/lastResetDate
	return await invoke<Plan>("plan_create", { input });
}

export async function planUpdate(plan: Plan) {
	return await invoke<Plan>("plan_update", { plan });
}

export async function planDelete(id: string) {
	return await invoke<boolean>("plan_delete", { id });
}

export async function planRefresh() {
	return await invoke<Plan[]>("plan_refresh");
}

export type HistoryRecord = {
	id: string;
	type: "todo_created" | "todo_completed";
	title: string;
	timestamp: string;
	itemId: string;
	itemType: "todo";
};

export async function historyList() {
	return await invoke<HistoryRecord[]>("history_list");
}
