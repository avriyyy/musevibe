import { create } from "zustand";
import type { CodeFile, Project, Screen, Task } from "./types";

interface VibeState {
  projects: Project[];
  tasksByProject: Record<string, Task[]>;
  screensByProject: Record<string, Screen[]>;
  filesByProject: Record<string, CodeFile[]>;
  prdByProject: Record<string, string>;
  addProject: (p: Project) => void;
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

export const useVibe = create<VibeState>((set) => ({
  projects: [seedProject],
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

  addProject: (p) =>
    set((s) => ({
      projects: [p, ...s.projects],
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
