import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

interface UserProfile {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  initials: string;
}

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    firstName: "",
    lastName: "",
    avatarUrl: null,
    initials: "U",
  });

  useEffect(() => {
    if (!user) return;

    const fn = user.first_name || user.firstName || "";
    const ln = user.last_name || user.lastName || "";
    const initials = `${fn[0] || ""}${ln[0] || ""}`.toUpperCase() || (user.email?.[0] || "U").toUpperCase();

    setProfile({ 
      firstName: fn, lastName: ln, avatarUrl: null, initials });
  }, [user]);

  return profile;
}
