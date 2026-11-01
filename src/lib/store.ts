import { create, type StateCreator } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  CloudWorkspaceRecord,
  CloudWorkspaceSnapshot,
  CodeFile,
  Project,
  ProjectDoc,
  Screen,
  Task,
} from "./types";
import { decideWorkspaceMerge } from "./workspace-merge";

interface VibeState {
  projects: Project[];
  draftIdea: string;
  tasksByProject: Record<string, Task[]>;
  screensByProject: Record<string, Screen[]>;
  filesByProject: Record<string, CodeFile[]>;
  prdByProject: Record<string, string>;
  docsByProject: Record<string, ProjectDoc[]>;
  cloudOwnerByProject: Record<string, string>;
  cloudRevisionByProject: Record<string, string>;
  cloudConflictByProject: Record<string, boolean>;
  setDraftIdea: (idea: string) => void;
  mergeCloudWorkspaces: (records: CloudWorkspaceRecord[], ownerId: string) => void;
  setCloudOwner: (projectId: string, ownerId: string) => void;
  setCloudRevision: (projectId: string, revision: string) => void;
  setCloudConflict: (projectId: string, conflict: boolean) => void;
  addProject: (p: Project) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  touchProject: (id: string) => void;
  setPrd: (projectId: string, md: string) => void;
  setTasks: (projectId: string, tasks: Task[]) => void;
  moveTask: (projectId: string, taskId: string, status: Task["status"]) => void;
  removeTask: (projectId: string, taskId: string) => void;
  setScreens: (projectId: string, screens: Screen[]) => void;
  setFiles: (projectId: string, files: CodeFile[]) => void;
  updateFile: (
    projectId: string,
    fileId: string,
    content: string,
    source?: CodeFile["source"],
  ) => void;
  seedDocs: (projectId: string, docs: ProjectDoc[]) => void;
  addDoc: (projectId: string, doc: ProjectDoc) => void;
  updateDoc: (
    projectId: string,
    docId: string,
    patch: Partial<ProjectDoc>,
  ) => void;
  removeDoc: (projectId: string, docId: string) => void;
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

const vibeState: StateCreator<VibeState> = (set) => ({
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
  docsByProject: {},
  cloudOwnerByProject: {},
  cloudRevisionByProject: {},
  cloudConflictByProject: {},

  setDraftIdea: (idea) => set({ draftIdea: idea }),
  mergeCloudWorkspaces: (records, ownerId) =>
    set((state) => {
      const remoteIds = new Set(records.map((record) => record.snapshot.project.id));
      const projectsById = new Map(state.projects.map((project) => [project.id, project]));
      const tasksByProject = { ...state.tasksByProject };
      const screensByProject = { ...state.screensByProject };
      const filesByProject = { ...state.filesByProject };
      const prdByProject = { ...state.prdByProject };
      const docsByProject = { ...state.docsByProject };
      const cloudOwnerByProject = { ...state.cloudOwnerByProject };
      const cloudRevisionByProject = { ...state.cloudRevisionByProject };
      const cloudConflictByProject = { ...state.cloudConflictByProject };

      for (const { snapshot, revision } of records) {
        const projectId = snapshot.project.id;
        const localProject = projectsById.get(projectId);
        const localSnapshot: CloudWorkspaceSnapshot | undefined = localProject
          ? {
              version: 1,
              project: localProject,
              prd: state.prdByProject[projectId] ?? "",
              tasks: state.tasksByProject[projectId] ?? [],
              screens: state.screensByProject[projectId] ?? [],
              files: state.filesByProject[projectId] ?? [],
              docs: state.docsByProject[projectId] ?? [],
            }
          : undefined;
        const decision = decideWorkspaceMerge({
          existingOwnerId: cloudOwnerByProject[projectId],
          accountId: ownerId,
          localRevision: cloudRevisionByProject[projectId],
          remoteRevision: revision,
          localSnapshotJson: localSnapshot ? JSON.stringify(localSnapshot) : undefined,
          remoteSnapshotJson: JSON.stringify(snapshot),
        });

        cloudOwnerByProject[projectId] = ownerId;
        if (decision === "replace") {
          projectsById.set(projectId, snapshot.project);
          tasksByProject[projectId] = snapshot.tasks;
          screensByProject[projectId] = snapshot.screens;
          filesByProject[projectId] = snapshot.files;
          prdByProject[projectId] = snapshot.prd;
          docsByProject[projectId] = snapshot.docs;
          cloudRevisionByProject[projectId] = revision;
          delete cloudConflictByProject[projectId];
        } else if (decision === "keep-pending") {
          cloudRevisionByProject[projectId] = revision;
          delete cloudConflictByProject[projectId];
        } else {
          cloudConflictByProject[projectId] = true;
        }
      }

      for (const [projectId, existingOwnerId] of Object.entries(cloudOwnerByProject)) {
        if (
          existingOwnerId === ownerId &&
          !remoteIds.has(projectId) &&
          !cloudRevisionByProject[projectId]
        ) {
          // Legacy Supabase-only or otherwise untracked cache: keep it locally,
          // but do not silently create or upload a Neon row for it.
          cloudConflictByProject[projectId] = true;
        }
      }

      const remoteProjects = records
        .map((record) => projectsById.get(record.snapshot.project.id))
        .filter((project): project is Project => project !== undefined);
      return {
        projects: [
          ...remoteProjects,
          ...state.projects.filter((project) => !remoteIds.has(project.id)),
        ],
        tasksByProject,
        screensByProject,
        filesByProject,
        prdByProject,
        docsByProject,
        cloudOwnerByProject,
        cloudRevisionByProject,
        cloudConflictByProject,
      };
    }),
  setCloudOwner: (projectId, ownerId) =>
    set((state) => ({
      cloudOwnerByProject: {
        ...state.cloudOwnerByProject,
        [projectId]: ownerId,
      },
    })),
  setCloudRevision: (projectId, revision) =>
    set((state) => ({
      cloudRevisionByProject: {
        ...state.cloudRevisionByProject,
        [projectId]: revision,
      },
    })),
  setCloudConflict: (projectId, conflict) =>
    set((state) => {
      const cloudConflictByProject = { ...state.cloudConflictByProject };
      if (conflict) cloudConflictByProject[projectId] = true;
      else delete cloudConflictByProject[projectId];
      return { cloudConflictByProject };
    }),
  updateProject: (id, patch) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, ...patch, lastOpenedAt: new Date().toISOString() } : p
      ),
    })),
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
    set((s) =>
      s.projects.some((project) => project.id === projectId)
        ? { prdByProject: { ...s.prdByProject, [projectId]: md } }
        : s,
    ),
  setTasks: (projectId, tasks) =>
    set((s) =>
      s.projects.some((project) => project.id === projectId)
        ? { tasksByProject: { ...s.tasksByProject, [projectId]: tasks } }
        : s,
    ),
  moveTask: (projectId, taskId, status) =>
    set((s) => ({
      ...(s.projects.some((project) => project.id === projectId)
        ? {
            tasksByProject: {
              ...s.tasksByProject,
              [projectId]: (s.tasksByProject[projectId] || []).map((t) =>
                t.id === taskId ? { ...t, status } : t,
              ),
            },
          }
        : {}),
    })),
  removeTask: (projectId, taskId) =>
    set((s) =>
      s.projects.some((project) => project.id === projectId)
        ? {
            tasksByProject: {
              ...s.tasksByProject,
              [projectId]: (s.tasksByProject[projectId] || []).filter(
                (t) => t.id !== taskId,
              ),
            },
          }
        : s,
    ),
  setScreens: (projectId, screens) =>
    set((s) =>
      s.projects.some((project) => project.id === projectId)
        ? { screensByProject: { ...s.screensByProject, [projectId]: screens } }
        : s,
    ),
  setFiles: (projectId, files) =>
    set((s) =>
      s.projects.some((project) => project.id === projectId)
        ? { filesByProject: { ...s.filesByProject, [projectId]: files } }
        : s,
    ),
  updateFile: (projectId, fileId, content, source) =>
    set((s) => ({
      ...(s.projects.some((project) => project.id === projectId)
        ? {
            filesByProject: {
              ...s.filesByProject,
              [projectId]: (s.filesByProject[projectId] || []).map((f) =>
                f.id === fileId
                  ? { ...f, content, ...(source ? { source } : {}) }
                  : f,
              ),
            },
          }
        : {}),
    })),
  seedDocs: (projectId, docs) =>
    set((s) =>
      s.projects.some((project) => project.id === projectId) &&
      s.docsByProject[projectId] === undefined
        ? { docsByProject: { ...s.docsByProject, [projectId]: docs } }
        : s,
    ),
  addDoc: (projectId, doc) =>
    set((s) =>
      s.projects.some((project) => project.id === projectId)
        ? {
            docsByProject: {
              ...s.docsByProject,
              [projectId]: [...(s.docsByProject[projectId] || []), doc],
            },
          }
        : s,
    ),
  updateDoc: (projectId, docId, patch) =>
    set((s) => ({
      ...(s.projects.some((project) => project.id === projectId)
        ? {
            docsByProject: {
              ...s.docsByProject,
              [projectId]: (s.docsByProject[projectId] || []).map((d) =>
                d.id === docId ? { ...d, ...patch } : d,
              ),
            },
          }
        : {}),
    })),
  removeDoc: (projectId, docId) =>
    set((s) =>
      s.projects.some((project) => project.id === projectId)
        ? {
            docsByProject: {
              ...s.docsByProject,
              [projectId]: (s.docsByProject[projectId] || []).filter(
                (d) => d.id !== docId,
              ),
            },
          }
        : s,
    ),
});

/**
 * The workspace survives a reload through localStorage. Hydration is skipped
 * during store creation because the pages are prerendered: reading storage
 * before the first client render would swap the project list mid-hydration.
 * StoreHydrator rehydrates right after mount instead.
 */
export const useVibe = create<VibeState>()(
  persist(vibeState, {
    name: "musevibe-store",
    version: 1,
    skipHydration: true,
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
      projects: state.projects,
      tasksByProject: state.tasksByProject,
      screensByProject: state.screensByProject,
      filesByProject: state.filesByProject,
      prdByProject: state.prdByProject,
      docsByProject: state.docsByProject,
      cloudOwnerByProject: state.cloudOwnerByProject,
      cloudRevisionByProject: state.cloudRevisionByProject,
      cloudConflictByProject: state.cloudConflictByProject,
    }),
  }),
);

export { seedId };
