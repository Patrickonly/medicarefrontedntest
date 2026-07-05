import { ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";

export default function SecurityAuditPage() {
  const { userRole } = useAuth();

  const isAdmin = userRole === "org_owner" || userRole === "admin" || userRole === "super_admin";

  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access denied</AlertTitle>
          <AlertDescription>
            The security audit dashboard is restricted to administrators.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="font-bold text-2xl text-slate-900">Security Audit</h1>
        <p className="text-sm text-slate-500 mt-1">Security features coming soon!</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Security Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500">Full security audit features will be available in future updates.</p>
        </CardContent>
      </Card>
    </div>
  );
}