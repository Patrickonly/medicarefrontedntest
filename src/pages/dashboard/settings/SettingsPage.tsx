import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, Building2, Loader2, Mail, MessageSquare, Save, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

type SettingsView = "menu" | "profile" | "org_profile" | "users" | "notifications";

const settingsSections = [
  { key: "profile" as const, icon: Users, title: "My Profile", desc: "Personal info and account" },
  { key: "notifications" as const, icon: Bell, title: "Notifications", desc: "Manage SMS and email alerts" },
  { key: "org_profile" as const, icon: Building2, title: "Organization Profile", desc: "Business details" },
  { key: "users" as const, icon: Users, title: "User Management", desc: "Manage staff accounts" },
];

export default function SettingsPage() {
  const { organizationId } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<SettingsView>("menu");

  // Organization Profile State
  const [editOrgName, setEditOrgName] = useState("");
  const [editOrgPhone, setEditOrgPhone] = useState("");
  const [editOrgEmail, setEditOrgEmail] = useState("");

  // User Profile State
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editUserPhone, setEditUserPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notification Preferences State
  const [authSmsEnabled, setAuthSmsEnabled] = useState(true);
  const [authEmailEnabled, setAuthEmailEnabled] = useState(true);
  const [systemSmsEnabled, setSystemSmsEnabled] = useState(true);
  const [systemEmailEnabled, setSystemEmailEnabled] = useState(true);
  const hasAuthToken = Boolean(localStorage.getItem("auth_token"));

  useEffect(() => {
    const tab = searchParams.get("tab") as SettingsView | null;
    if (tab && ["profile", "notifications", "org_profile", "users"].includes(tab)) {
      setView(tab);
    }
  }, [searchParams]);

  // Queries
  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ["organization", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const res = await api.get(`/api/organizations?id=${organizationId}`, { organizationId });
      return (res as any).data;
    },
    enabled: !!organizationId,
  });

  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const res = await api.get("/api/users/profile", organizationId ? { organizationId } : undefined);
      return (res as any).data;
    },
  });

  const { data: notificationPrefs, isLoading: prefsLoading } = useQuery({
    queryKey: ["notificationPrefs"],
    queryFn: async () => {
      const res = await api.get("/api/notifications/preferences");
      return (res as any).data;
    },
    enabled: hasAuthToken,
  });

  // Effects
  useEffect(() => {
    if (orgData) {
      setEditOrgName(orgData.name || "");
      setEditOrgPhone(orgData.phone || "");
      setEditOrgEmail(orgData.email || "");
    }
  }, [orgData]);

  useEffect(() => {
    if (userProfile) {
      setEditFirstName(userProfile.first_name || "");
      setEditLastName(userProfile.last_name || "");
      setEditUserPhone(userProfile.phone || "");
    }
  }, [userProfile]);

  useEffect(() => {
    if (notificationPrefs) {
      setAuthSmsEnabled(notificationPrefs.authSmsEnabled ?? notificationPrefs.smsEnabled ?? true);
      setAuthEmailEnabled(notificationPrefs.authEmailEnabled ?? notificationPrefs.emailEnabled ?? true);
      setSystemSmsEnabled(notificationPrefs.systemSmsEnabled ?? notificationPrefs.smsEnabled ?? true);
      setSystemEmailEnabled(notificationPrefs.systemEmailEnabled ?? notificationPrefs.emailEnabled ?? true);
    }
  }, [notificationPrefs]);

  // Mutations
  const updateOrgMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.put(`/api/organizations?id=${organizationId}`, data, { organizationId: organizationId || undefined });
      return (res as any).data;
    },
    onSuccess: () => {
      success("Success", "Organization profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["organization", organizationId] });
    },
    onError: (mutationError: any) => {
      error("Error", mutationError.message || "Failed to update organization profile");
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.put("/api/users/profile", data, organizationId ? { organizationId } : undefined);
      return (res as any).data;
    },
    onSuccess: () => {
      success("Success", "Profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
    onError: (mutationError: any) => {
      error("Error", mutationError.message || "Failed to update profile");
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/api/users/profile/change-password", data);
      return res as any;
    },
    onSuccess: (res: any) => {
      success("Success", res.message || "Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (mutationError: any) => {
      error("Error", mutationError.message || "Failed to change password");
    }
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.put("/api/notifications/preferences", data);
      return (res as any).data;
    },
    onSuccess: () => {
      success("Success", "Notification preferences updated successfully");
      queryClient.invalidateQueries({ queryKey: ["notificationPrefs"] });
    },
    onError: (mutationError: any) => {
      error("Error", mutationError.message || "Failed to update preferences");
    }
  });

  // Handlers
  const handleSaveOrg = () => {
    if (!organizationId) return;
    updateOrgMutation.mutate({
      name: editOrgName,
      phone: editOrgPhone || null,
      email: editOrgEmail || null,
    });
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      first_name: editFirstName,
      last_name: editLastName,
      phone: editUserPhone || null,
    });
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      error("Error", "All password fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      error("Error", "New passwords do not match");
      return;
    }
    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
      confirmPassword,
    });
  };

  const handleSaveNotifications = () => {
    if (!hasAuthToken) {
      error("Error", "You must be logged in to save notification preferences");
      return;
    }

    if (!authSmsEnabled && !authEmailEnabled) {
      error("Error", "You cannot disable both SMS and Email for authentication notifications at the same time");
      return;
    }
    if (!systemSmsEnabled && !systemEmailEnabled) {
      error("Error", "You cannot disable both SMS and Email for system notifications at the same time");
      return;
    }
    updateNotificationsMutation.mutate({
      smsEnabled: authSmsEnabled || systemSmsEnabled,
      emailEnabled: authEmailEnabled || systemEmailEnabled,
      authSmsEnabled,
      authEmailEnabled,
      systemSmsEnabled,
      systemEmailEnabled,
    });
  };

  // Render Helpers
  const renderBackButton = () => (
    <Button variant="ghost" onClick={() => setView("menu")} className="mb-4">
      <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
    </Button>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      {renderBackButton()}
      <div>
        <h2 className="font-bold text-xl text-slate-900">My Profile</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your personal account information</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {profileLoading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={editUserPhone}
                  onChange={(e) => setEditUserPhone(e.target.value)}
                  className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
                />
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                className="bg-[#0aa9ad] hover:bg-[#07969a] text-white rounded-xl"
              >
                {updateProfileMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm mt-6">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
              />
            </div>
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={changePasswordMutation.isPending}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
          >
            {changePasswordMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Changing...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" /> Change Password</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      {renderBackButton()}
      <div>
        <h2 className="font-bold text-xl text-slate-900">Notification Preferences</h2>
        <p className="text-sm text-slate-500 mt-1">Manage how you receive alerts and notifications</p>
      </div>

      {/* Authentication Notifications Section */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Authentication Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {prefsLoading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#0aa9ad]/10 rounded-xl">
                    <MessageSquare className="h-5 w-5 text-[#0aa9ad]" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">SMS Authentication</p>
                    <p className="text-sm text-slate-500">Receive OTP codes and auth alerts via SMS</p>
                  </div>
                </div>
                <Switch
                  checked={authSmsEnabled}
                  onCheckedChange={setAuthSmsEnabled}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#0aa9ad]/10 rounded-xl">
                    <Mail className="h-5 w-5 text-[#0aa9ad]" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Email Authentication</p>
                    <p className="text-sm text-slate-500">Receive OTP codes and auth alerts via email</p>
                  </div>
                </div>
                <Switch
                  checked={authEmailEnabled}
                  onCheckedChange={setAuthEmailEnabled}
                />
              </div>

              <p className="text-sm text-slate-500 bg-yellow-50 border border-yellow-200 p-3 rounded-xl">
                <strong>Note:</strong> You cannot disable both SMS and Email for authentication notifications at the same time.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* System Notifications Section */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>System Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {prefsLoading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#0aa9ad]/10 rounded-xl">
                    <MessageSquare className="h-5 w-5 text-[#0aa9ad]" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">SMS System Notifications</p>
                    <p className="text-sm text-slate-500">Receive system updates and reminders via SMS</p>
                  </div>
                </div>
                <Switch
                  checked={systemSmsEnabled}
                  onCheckedChange={setSystemSmsEnabled}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#0aa9ad]/10 rounded-xl">
                    <Mail className="h-5 w-5 text-[#0aa9ad]" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Email System Notifications</p>
                    <p className="text-sm text-slate-500">Receive system updates and reminders via email</p>
                  </div>
                </div>
                <Switch
                  checked={systemEmailEnabled}
                  onCheckedChange={setSystemEmailEnabled}
                />
              </div>

              <p className="text-sm text-slate-500 bg-yellow-50 border border-yellow-200 p-3 rounded-xl">
                <strong>Note:</strong> You cannot disable both SMS and Email for system notifications at the same time.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleSaveNotifications}
        disabled={updateNotificationsMutation.isPending}
        className="bg-[#0aa9ad] hover:bg-[#07969a] text-white rounded-xl"
      >
        {updateNotificationsMutation.isPending ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
        ) : (
          <><Save className="mr-2 h-4 w-4" /> Save Preferences</>
        )}
      </Button>
    </div>
  );

  const renderOrgProfile = () => (
    <div className="space-y-6">
      {renderBackButton()}
      <div>
        <h2 className="font-bold text-xl text-slate-900">Organization Profile</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your business details</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {orgLoading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={editOrgName}
                  onChange={(e) => setEditOrgName(e.target.value)}
                  className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="orgPhone">Phone Number</Label>
                  <Input
                    id="orgPhone"
                    value={editOrgPhone}
                    onChange={(e) => setEditOrgPhone(e.target.value)}
                    className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="orgEmail">Email Address</Label>
                  <Input
                    id="orgEmail"
                    type="email"
                    value={editOrgEmail}
                    onChange={(e) => setEditOrgEmail(e.target.value)}
                    className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveOrg}
                disabled={updateOrgMutation.isPending}
                className="bg-[#0aa9ad] hover:bg-[#07969a] text-white rounded-xl"
              >
                {updateOrgMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {view === "menu" && (
        <div className="space-y-6">
          <div>
            <h1 className="font-bold text-2xl text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your organization and account</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {settingsSections.map((s) => (
              <button
                key={s.key}
                onClick={() => setView(s.key)}
                className="p-6 border border-slate-200 rounded-xl text-left hover:bg-slate-50 transition-colors"
              >
                <div className="p-3 bg-slate-100 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
                  <s.icon className="h-6 w-6 text-slate-700" />
                </div>
                <h3 className="font-semibold text-slate-900">{s.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}
      {view === "profile" && renderProfile()}
      {view === "notifications" && renderNotifications()}
      {view === "org_profile" && renderOrgProfile()}
      {view === "users" && (
        <div className="space-y-6">
          {renderBackButton()}
          <div>
            <h2 className="font-bold text-xl text-slate-900">User Management</h2>
            <p className="text-sm text-slate-500 mt-1">Go to the Users page to manage staff accounts</p>
          </div>
          <Button
            onClick={() => window.location.href = "/dashboard/users"}
            className="bg-[#0aa9ad] hover:bg-[#07969a] text-white rounded-xl"
          >
            Go to Users Page
          </Button>
        </div>
      )}
    </div>
  );
}
