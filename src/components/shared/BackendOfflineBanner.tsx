import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function BackendOfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener("api:offline", handleOffline);
    window.addEventListener("api:online", handleOnline);

    return () => {
      window.removeEventListener("api:offline", handleOffline);
      window.removeEventListener("api:online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-[100] bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center shadow-md animate-in slide-in-from-top-full duration-300">
      <WifiOff className="w-4 h-4 mr-2" />
      <span className="text-sm font-semibold">You are not online. Unable to reach the backend server.</span>
    </div>
  );
}
