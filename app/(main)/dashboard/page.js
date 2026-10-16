"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import NewProjectForm from "@/components/NewProjectForm";
import ProjectCard from "@/components/ProjectCard";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);

  // Load (or reload) the project list from the API
  const loadProjects = useCallback(async () => {
    const response = await fetch("/api/projects");
    if (response.ok) setProjects((await response.json()).projects);
  }, []);

  useEffect(() => {
    async function loadPage() {
      const response = await fetch("/api/auth/me");
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      setUser((await response.json()).user);
      await loadProjects();
    }
    loadPage();
  }, [router, loadProjects]);

  if (!user) {
    return <main className="min-h-screen bg-zinc-50 p-8 text-zinc-600">Loading...</main>;
  }

  const isAdmin = user.role === "admin";

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <AppHeader user={user} />

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold">{isAdmin ? "All projects" : "My projects"}</h1>
          {isAdmin && (
            <p className="text-sm text-zinc-600">Admin view: every user&apos;s projects, read-only.</p>
          )}
        </div>

        {!isAdmin && <NewProjectForm onCreated={loadProjects} />}

        {projects.length === 0 ? (
          <p className="text-zinc-600">No projects yet. Create your first one above.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard
                key={project.project_id}
                project={project}
                canEdit={!isAdmin}
                showOwner={isAdmin}
                onChanged={loadProjects}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}