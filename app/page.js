import { redirect } from "next/navigation";

// The home page just forwards to the dashboard (or to /login if not logged in)
export default function Home() {
  redirect("/dashboard");
}