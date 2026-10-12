"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Loads the logged-in user from /api/auth/me. Sends the browser to /login if nobody is logged in.
// Returns null while loading.
export default function useCurrentUser() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => {
        if (response.status === 401) {
          router.push("/login");
          return null;
        }
        return response.json();
      })
      .then((data) => data && setUser(data.user));
  }, [router]);

  return user;
}