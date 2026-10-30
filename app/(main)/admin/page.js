"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import useCurrentUser from "@/components/useCurrentUser";

function formatDate(value) {
  if (!value) return "No sources yet";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// One headline number
function StatTile({ label, value, detail }) {
  return (
    <div className="panel p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-muted">{detail}</p>}
    </div>
  );
}

// Horizontal bars for a small breakdown (one colour, value written next to each bar)
function BarList({ title, rows, label, value, empty }) {
  const max = Math.max(1, ...rows.map(value));
  return (
    <section className="panel p-5">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((row) => (
            <li key={label(row)} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3 text-sm"
              title={`${label(row)}: ${value(row)}`}>
              <span className="truncate">{label(row)}</span>
              <span className="h-2 overflow-hidden rounded-full bg-line">
                <span className="block h-full rounded-full bg-brand" style={{ width: `${(value(row) / max) * 100}%` }} />
              </span>
              <span className="text-right tabular-nums">{value(row)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Admin page: site-wide totals, every user with their activity, and breakdowns.
// proxy.js sends non-admins away from /admin; the API routes check the role too.
export default function AdminPage() {
  const user = useCurrentUser();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");

  // Changing reloadKey makes the effect below fetch everything again (after a delete)
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    Promise.all([fetch("/api/admin/stats"), fetch("/api/admin/users")]).then(async ([statsRes, usersRes]) => {
      if (!statsRes.ok || !usersRes.ok) {
        setError((await (statsRes.ok ? usersRes : statsRes).json()).error);
        return;
      }
      // Read both bodies first, then set both, so the page never renders with only one of them
      const [statsBody, usersBody] = await Promise.all([statsRes.json(), usersRes.json()]);
      setStats(statsBody);
      setUsers(usersBody.users);
    });
  }, [reloadKey]);

  async function deleteUser(target) {
    const sure = window.confirm(
      `Delete ${target.name} (${target.email})? Their ${target.project_count} projects and ${target.source_count} sources will be deleted too. This cannot be undone.`
    );
    if (!sure) return;

    const response = await fetch(`/api/admin/users/${target.user_id}`, { method: "DELETE" });
    if (!response.ok) {
      window.alert((await response.json()).error);
      return;
    }
    setReloadKey((key) => key + 1);
  }

  if (!user || ((!stats || !users) && !error)) {
    return <main className="min-h-screen p-8 text-muted">Loading...</main>;
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <AppHeader user={user} />
        <main className="mx-auto max-w-5xl px-6 py-10">
          <p className="error-box">{error}</p>
        </main>
      </div>
    );
  }

  const { totals, byType, popularTags, mostCited } = stats;

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-1 text-muted">
            Activity across the whole site. Projects are read-only for the admin; open them from{" "}
            <Link href="/dashboard" className="text-brand hover:underline">All projects</Link>.
          </p>
        </div>

        {/* Site-wide totals */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Users" value={totals.users} detail={`${totals.researchers} researchers`} />
          <StatTile label="Projects" value={totals.projects} detail={`${totals.active_projects} active`} />
          <StatTile label="Sources" value={totals.sources} detail={`${totals.authors} authors, ${totals.tags} tags`} />
          <StatTile label="Citations" value={totals.citations} />
          <StatTile label="Reading time" value={`${Math.round(totals.total_minutes / 60)} h`}
            detail={`${totals.total_minutes} minutes`} />
          <StatTile label="Embedded" value={`${totals.embedded_sources}/${totals.sources}`}
            detail={totals.embedded_sources < totals.sources ? "Run npm run embeddings" : "Ready for search"} />
        </section>

        {/* Users */}
        <section className="panel overflow-hidden">
          <h2 className="px-5 pt-5 font-display text-lg font-semibold">Users</h2>
          <div className="relative overflow-x-auto">
            <table className="mt-3 w-full min-w-[44rem] text-left text-sm">
              <thead className="border-y border-line bg-canvas/60 text-xs text-muted">
                <tr>
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Institution</th>
                  <th className="px-3 py-2 text-right font-medium">Projects</th>
                  <th className="px-3 py-2 text-right font-medium">Sources</th>
                  <th className="px-3 py-2 text-right font-medium">Reading</th>
                  <th className="px-3 py-2 font-medium">Last source</th>
                  <th className="px-5 py-2"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((row) => (
                  <tr key={row.user_id}>
                    <td className="px-5 py-3">
                      <p className="font-medium">{row.name}</p>
                      <p className="text-xs text-muted">{row.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        row.role === "admin" ? "bg-accent-soft text-accent" : "bg-brand-soft text-brand"}`}>
                        {row.role}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted">{row.institution ?? "-"}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{row.project_count}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{row.source_count}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{row.total_minutes} min</td>
                    <td className="px-3 py-3 text-muted">{formatDate(row.last_active)}</td>
                    <td className="px-5 py-3 text-right">
                      {row.role === "researcher" && (
                        <button onClick={() => deleteUser(row)} className="text-red-700 hover:underline">Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Breakdowns */}
        <div className="grid gap-4 md:grid-cols-2">
          <BarList title="Sources by type" rows={byType} label={(row) => row.type.charAt(0).toUpperCase() + row.type.slice(1)} value={(row) => row.count}
            empty="No sources yet." />
          <BarList title="Tags used on 2+ sources" rows={popularTags} label={(row) => row.name}
            value={(row) => row.uses} empty="No tag is used more than once yet." />
        </div>

        <section className="panel p-5">
          <h2 className="font-display text-lg font-semibold">Most-cited sources</h2>
          {mostCited.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No citations yet.</p>
          ) : (
            <ol className="mt-3 divide-y divide-line">
              {mostCited.map((source) => (
                <li key={source.source_id} className="flex items-center gap-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <Link href={`/sources/${source.source_id}`} className="font-medium hover:text-brand hover:underline">
                      {source.title}
                    </Link>
                    <p className="text-sm text-muted">{source.project_title}</p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums">
                    cited {source.times_cited} {source.times_cited === 1 ? "time" : "times"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}
