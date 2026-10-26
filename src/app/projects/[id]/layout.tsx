import { AppTopNav } from "@/components/AppTopNav";
import { ProjectTabs } from "@/components/ProjectTabs";

export function generateStaticParams() {
  return [{ id: "demo-indie" }];
}

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex-1 flex flex-col">
      <AppTopNav
        items={[{ label: "Projects", href: "/projects" }]}
        actionHref="/projects"
        actionLabel="New project"
      />
      <main className="w-full max-w-[1080px] mx-auto px-5 py-6 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-line shadow-sm overflow-hidden">
          <ProjectTabs projectId={id} />
          <div className="p-5">{children}</div>
        </div>
        <p className="font-code text-[11px] text-muted px-1">Project {id}</p>
      </main>
    </div>
  );
}
