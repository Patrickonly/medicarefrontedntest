import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "./useAuth";

export interface SubscriptionData {
  id: string;
  organizationId: string;
  plan: string;
  status: string;
  startDate: string;
  endDate: string;
  remainingDays: number;
  paymentStatus: string;
  paymentMethod: string;
  isActive: boolean;
}

interface SubscriptionContextType {
  subscription: SubscriptionData | null;
  isLoading: boolean;
  refetch: () => Promise<any>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const organizationId = (user as any)?.organizationId || (user as any)?.organization_id || (user as any)?.organization?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-subscription", organizationId],
    queryFn: async () => {
      try {
        const res = await api.get<{ success: boolean; subscription: SubscriptionData | null }>("/api/my-subscription");
        return res.subscription || null;
      } catch (err: any) {
        // A 401 here means the token expired between the auth check and this
        // call.  Return null (= no subscription) so the gate shows the
        // locked screen rather than crashing or triggering a logout loop.
        if (err?.message?.includes('Session expired') || err?.message?.includes('Unauthorized')) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!user && !!organizationId && !authLoading,
    retry: false,
    staleTime: 30_000,  // 30s — don't re-fetch on every render
  });

  return (
    <SubscriptionContext.Provider value={{ subscription: data || null, isLoading: isLoading || authLoading, refetch }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
