/**
 * Minimal local starter files so the Code view is never an empty room. These
 * are clearly-marked stubs, not AI output: the model has not written any app
 * code yet, so the stub renders the project name and idea and invites the
 * real build to replace it.
 */

import type { CodeFile, Project } from "./types";

function component(name: string, idea: string): string {
  const safeName = name.replace(/[`\\$]/g, "");
  const safeIdea = idea.replace(/[`\\$]/g, "").slice(0, 200);
  return `// Starter stub generated locally. Replace with the real build.
export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 32 }}>
      <h1>${safeName}</h1>
      <p>${safeIdea}</p>
    </main>
  );
}
`;
}

function nativeComponent(name: string, idea: string): string {
  const safeName = name.replace(/[`\\$]/g, "");
  const safeIdea = idea.replace(/[`\\$]/g, "").slice(0, 200);
  return `// Starter stub generated locally. Replace with the real build.
import { Text, View } from "react-native";

export default function App() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>${safeName}</Text>
      <Text>${safeIdea}</Text>
    </View>
  );
}
`;
}

export function starterFiles(project: Project): CodeFile[] {
  const name = project.name.trim() || "MuseVibe App";
  const idea = project.idea.trim() || "An idea, about to become an app.";
  if (project.platform === "mobile") {
    return [
      {
        id: "starter-app",
        path: "App.tsx",
        content: nativeComponent(name, idea),
        language: "tsx",
      },
    ];
  }
  if (project.platform === "desktop" || project.framework === "vite-react") {
    return [
      {
        id: "starter-app",
        path: "src/App.tsx",
        content: component(name, idea),
        language: "tsx",
      },
    ];
  }
  return [
    {
      id: "starter-page",
      path: "app/page.tsx",
      content: component(name, idea),
      language: "tsx",
    },
  ];
}
