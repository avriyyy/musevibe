import { create } from "zustand";
import type { CodeFile, Project, Screen, Task } from "./types";

interface VibeState {
  projects: Project[];
  draftIdea: string;
  tasksByProject: Record<string, Task[]>;
  screensByProject: Record<string, Screen[]>;
  filesByProject: Record<string, CodeFile[]>;
  prdByProject: Record<string, string>;
  setDraftIdea: (idea: string) => void;
  addProject: (p: Project) => void;
  touchProject: (id: string) => void;
  setPrd: (projectId: string, md: string) => void;
  setTasks: (projectId: string, tasks: Task[]) => void;
  moveTask: (projectId: string, taskId: string, status: Task["status"]) => void;
  setScreens: (projectId: string, screens: Screen[]) => void;
  setFiles: (projectId: string, files: CodeFile[]) => void;
  updateFile: (projectId: string, fileId: string, content: string) => void;
}

const seedId = () =>
  Math.random().toString(36).slice(2, 9);

export const seedProject: Project = {
  id: "demo-indie",
  name: "Demo Habit Tracker",
  idea: "A habit tracker for indie devs that never guilt-trips",
  createdAt: new Date().toISOString(),
};

const DAY = 86400000;
const HOUR = 3600000;
const now = Date.now();

export const seedProjects: Project[] = [
  { ...seedProject, lastOpenedAt: new Date(now - HOUR).toISOString() },
  { id: "seed-portfolio", name: "Portfolio Snapshot", idea: "A one-page portfolio for a freelance illustrator", createdAt: new Date(now - DAY).toISOString(), lastOpenedAt: new Date(now - 3 * HOUR).toISOString() },
  { id: "seed-invoice", name: "Invoice Buddy", idea: "Simple invoicing for solo founders", createdAt: new Date(now - 2 * DAY).toISOString(), lastOpenedAt: new Date(now - 7 * HOUR).toISOString() },
  { id: "seed-standup", name: "Standup Bot", idea: "A Discord bot that runs async standups", createdAt: new Date(now - 3 * DAY).toISOString(), lastOpenedAt: new Date(now - DAY).toISOString() },
  { id: "seed-changelog", name: "Changelog Mail", idea: "Weekly changelog emails generated from git commits", createdAt: new Date(now - 4 * DAY).toISOString(), lastOpenedAt: new Date(now - 2 * DAY).toISOString() },
  { id: "seed-focus", name: "Focus Timer", idea: "A pomodoro timer with streaks", createdAt: new Date(now - 5 * DAY).toISOString(), lastOpenedAt: new Date(now - 3 * DAY).toISOString() },
  { id: "seed-links", name: "Link Garden", idea: "A link-in-bio page with basic analytics", createdAt: new Date(now - 6 * DAY).toISOString(), lastOpenedAt: new Date(now - 5 * DAY).toISOString() },
  { id: "seed-bug", name: "Bug Snap", idea: "Screenshot bug reports with console logs attached", createdAt: new Date(now - 7 * DAY).toISOString(), lastOpenedAt: new Date(now - 6 * DAY).toISOString() },
  { id: "seed-waitlist", name: "Waitlist Page", idea: "Waitlist landing with referral counting", createdAt: new Date(now - 8 * DAY).toISOString(), lastOpenedAt: new Date(now - 8 * DAY).toISOString() },
  { id: "seed-docs", name: "Docs Starter", idea: "A docs site scaffolded from a markdown folder", createdAt: new Date(now - 9 * DAY).toISOString(), lastOpenedAt: new Date(now - 10 * DAY).toISOString() },
];

export const useVibe = create<VibeState>((set) => ({
  projects: seedProjects,
  draftIdea: "",
  tasksByProject: {
    "demo-indie": [
      { id: seedId(), title: "Set up landing + auth", status: "done" },
      { id: seedId(), title: "Write PRD + Kanban", status: "doing" },
      { id: seedId(), title: "Wireframe 3 screens", status: "todo" },
      { id: seedId(), title: "Code editor + preview", status: "todo" },
    ],
  },
  screensByProject: { "demo-indie": [] },
  filesByProject: {
    "demo-indie": [
      {
        id: "f1",
        path: "app/page.tsx",
        language: "tsx",
        content: `export default function App() {\n  return <h1>Hello MuseVibe</h1>;\n}`,
      },
    ],
  },
  prdByProject: { "demo-indie": "# PRD Demo\n\nProblem: indie devs keep switching tools." },

  setDraftIdea: (idea) => set({ draftIdea: idea }),
  addProject: (p) =>
    set((s) => ({
      projects: [{ ...p, lastOpenedAt: new Date().toISOString() }, ...s.projects],
      tasksByProject: { ...s.tasksByProject, [p.id]: [] },
      filesByProject: {
        ...s.filesByProject,
        [p.id]: [
          {
            id: seedId(),
            path: "app/page.tsx",
            language: "tsx",
            content: `export default function App() {\n  return <h1>${p.name}</h1>;\n}`,
          },
        ],
      },
      screensByProject: { ...s.screensByProject, [p.id]: [] },
      prdByProject: { ...s.prdByProject, [p.id]: "" },
    })),
  touchProject: (id) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, lastOpenedAt: new Date().toISOString() } : p
      ),
    })),
  setPrd: (projectId, md) =>
    set((s) => ({ prdByProject: { ...s.prdByProject, [projectId]: md } })),
  setTasks: (projectId, tasks) =>
    set((s) => ({ tasksByProject: { ...s.tasksByProject, [projectId]: tasks } })),
  moveTask: (projectId, taskId, status) =>
    set((s) => ({
      tasksByProject: {
        ...s.tasksByProject,
        [projectId]: (s.tasksByProject[projectId] || []).map((t) =>
          t.id === taskId ? { ...t, status } : t
        ),
      },
    })),
  setScreens: (projectId, screens) =>
    set((s) => ({ screensByProject: { ...s.screensByProject, [projectId]: screens } })),
  setFiles: (projectId, files) =>
    set((s) => ({ filesByProject: { ...s.filesByProject, [projectId]: files } })),
  updateFile: (projectId, fileId, content) =>
    set((s) => ({
      filesByProject: {
        ...s.filesByProject,
        [projectId]: (s.filesByProject[projectId] || []).map((f) =>
          f.id === fileId ? { ...f, content } : f
        ),
      },
    })),
}));

export { seedId };
