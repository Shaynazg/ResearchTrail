"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import NewProjectForm from "@/components/NewProjectForm";
import ProjectCard from "@/components/ProjectCard";

// "1 project", "2 projects"
function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);

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
    return <main className="min-h-screen p-8 text-muted">Loading...</main>;
  }

  const isAdmin = user.role === "admin";
  const totalSources = projects.reduce((sum, project) => sum + project.source_count, 0);
  const totalMinutes = projects.reduce((sum, project) => sum + project.total_minutes, 0);

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {isAdmin ? "All projects" : "My projects"}
            </h1>
            <p className="mt-1 text-muted">
              {isAdmin
                ? "Every user's projects, read-only."
                : `${plural(projects.length, "project")}, ${plural(totalSources, "source")}, ${plural(Math.round(totalMinutes / 60), "hour")} of reading`}
            </p>
          </div>
          {!isAdmin && !showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary">+ New project</button>
          )}
        </div>

        {!isAdmin && showForm && (
          <NewProjectForm
            onCreated={() => {
              setShowForm(false);
              loadProjects();
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {projects.length === 0 ? (
          <div className="panel p-8 text-center text-muted">
            No projects yet. Create one to start logging sources.
          </div>
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