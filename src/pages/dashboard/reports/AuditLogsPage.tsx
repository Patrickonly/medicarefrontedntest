import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AuditLogEntry {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
  user_id?: string;
}

export default function AuditLogsPage() {
  const { organizationId } = useAuth();

  const { data: logs = [], isLoading, isError } = useQuery({
    queryKey: ["audit-logs", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const res = await api.get<{ data: AuditLogEntry[] }>(
        `/api/audit_logs?organization_id=${organizationId}&limit=50`
      );
      return res.data || [];
    },
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground">Track all major changes and operations within the system.</p>
        </div>
      </div>

      <Card className="border-border shadow-sm rounded-2xl">
        <CardHeader className="bg-background/50 border-b border-border py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#0aa9ad]" />
            System Events
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-red-600">
                    Failed to load audit logs. Please try again.
                  </TableCell>
                </TableRow>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs">{log.user_id || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[320px] truncate" title={log.details || undefined}>
                      {log.details || "-"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No audit logs found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
