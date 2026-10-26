export type TaskStatus = "todo" | "doing" | "done";

export interface Project {
  id: string;
  name: string;
  idea: string;
  createdAt: string;
}

export interface Prd {
  problem: string;
  users: string;
  features: string[];
  scopeOut: string[];
  raw: string;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  linkedScreenId?: string;
  notes?: string;
}

export interface Screen {
  id: string;
  name: string;
  canvasJson: string; // tldraw snapshot JSON (stringified)
  components: string[];
}

export interface CodeFile {
  id: string;
  path: string;
  content: string;
  language: string;
}
