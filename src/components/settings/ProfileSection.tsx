import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { ROLE_LABELS } from "@/types/rbac";
import {
    AlertTriangle,
    ArrowLeft,
    Camera,
    Loader2,
    Lock,
    LogOut,
    Mail, Phone,
    Save,
    User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ActivityLog from "./ActivityLog";
import TrustedDevicesSection from "./TrustedDevicesSection";
import TwoFactorSetup from "./TwoFactorSetup";

interface ProfileProps {
  onBack: () => void;
}

export default function ProfileSection({ onBack }: ProfileProps) {
  const { success, error: toastError } = useToast();
  const { user, userRole, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [passwordStep, setPasswordStep] = useState<"form" | "otp">("form");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: any }>("/api/users/profile");
      const data = res.data;
      if (data) {
        setFirstName(data.firstName || data.first_name || "");
        setLastName(data.lastName || data.last_name || "");
        setPhone(data.phone || "");
        setAvatarUrl(data.avatarUrl || data.avatar_url || null);
      }
    } catch (fetchError: any) {
      toastError("Error", fetchError.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const logAudit = (action: string, details: string, risk: "low" | "medium" | "high" = "low") => {
    api.post("/api/audit-logs", {
      action,
      resource_type: "user_account",
      resource_id: user?.id,
      risk_level: risk,
      details,
    }).catch(() => undefined);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!firstName.trim() || !lastName.trim()) {
      toastError("Error", "First and last name are required");
      return;
    }
    setSaving(true);
    try {
      await api.put("/api/users/profile", { first_name: firstName, last_name: lastName, phone: phone || null });
      success("Success", "Profile updated");
      logAudit("profile_updated", "Personal information updated");
    } catch (saveError: any) {
      toastError("Error", saveError.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toastError("Error", "Avatar must be less than 2MB");
      return;
    }
    setUploading(true);
    try {
      const uploadRes = await api.upload<{ success: boolean; data: { url: string } }>("/api/uploads", file);
      const url = uploadRes.data.url;
      await api.put("/api/users/profile", { avatarUrl: url });
      setAvatarUrl(url);
      success("Success", "Avatar updated");
      logAudit("avatar_updated", "Profile picture updated");
    } catch (uploadError: any) {
      toastError("Error", uploadError.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    try {
      await api.put("/api/users/profile", { avatarUrl: null });
      setAvatarUrl(null);
      success("Success", "Avatar removed");
    } catch (removeError: any) {
      toastError("Error", removeError.message || "Failed to remove avatar");
    }
  };

  const handleRequestPasswordOtp = async () => {
    if (!oldPassword) {
      toastError("Error", "Please enter your current password");
      return;
    }
    if (newPassword.length < 8) {
      toastError("Error", "New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toastError("Error", "Passwords do not match");
      return;
    }
    setChangingPassword(true);
    try {
      await api.post("/api/users/profile/change-password", { action: "REQUEST_OTP", oldPassword });
      success("Verification code sent", "Enter the code we sent you to confirm the password change.");
      setPasswordStep("otp");
    } catch (requestError: any) {
      toastError("Error", requestError.message || "Failed to send verification code");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleVerifyAndChangePassword = async () => {
    if (!otpCode) {
      toastError("Error", "Please enter the verification code");
      return;
    }
    setVerifyingOtp(true);
    try {
      await api.post("/api/users/profile/change-password", {
        action: "VERIFY_AND_CHANGE",
        newPassword,
        otpCode,
      });
      logAudit("password_changed", "Account password was changed", "medium");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOtpCode("");
      setPasswordStep("form");
      success("Success", "Password changed. Please sign in again with your new password.");
      await signOut();
    } catch (verifyError: any) {
      toastError("Error", verifyError.message || "Failed to verify code");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setPasswordStep("form");
    setOtpCode("");
  };

  const handleSignOut = async () => {
    if (user) {
      logAudit("sign_out", "User signed out");
    }
    await signOut();
    success("Success", "Signed out");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";
  const roleLabel = userRole ? (ROLE_LABELS as Record<string, string>)[userRole] || userRole : "Member";

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={16} /> Back to Settings
      </button>

      <div>
        <h2 className="font-display font-bold text-xl text-foreground">My Profile</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your personal information and account security</p>
      </div>

      {/* Avatar */}
      <div className="medicare-card">
        <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
          <Camera size={16} className="text-primary" /> Profile Picture
        </h3>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl overflow-hidden flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              {uploading ? "Uploading..." : "Upload new"}
            </Button>
            {avatarUrl && (
              <Button variant="ghost" size="sm" onClick={handleRemoveAvatar} className="text-destructive hover:text-destructive">
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="medicare-card space-y-4">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <User size={16} className="text-primary" /> Personal Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">First Name *</label>
            <input className="medicare-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Last Name *</label>
            <input className="medicare-input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1.5">
              <Mail size={12} /> Email
            </label>
            <input className="medicare-input bg-muted/50" value={user?.email || ""} disabled />
            <p className="text-[10px] text-muted-foreground mt-1">Contact support to change your email</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1.5">
              <Phone size={12} /> Phone
            </label>
            <input className="medicare-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+255 ..." />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
            <input className="medicare-input bg-muted/50" value={roleLabel} disabled />
          </div>
        </div>
        <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Changes
        </Button>
      </div>

      {/* Password */}
      <div className="medicare-card space-y-4">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <Lock size={16} className="text-primary" /> Change Password
        </h3>

        {passwordStep === "form" ? (
          <>
            <p className="text-xs text-muted-foreground">Use at least 8 characters. Make it strong and unique.</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Current Password</label>
              <input type="password" className="medicare-input" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">New Password</label>
                <input type="password" className="medicare-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Confirm New Password</label>
                <input type="password" className="medicare-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </div>
            <Button onClick={handleRequestPasswordOtp} disabled={changingPassword || !oldPassword || !newPassword} className="gap-2">
              {changingPassword ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              Send Verification Code
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">Enter the verification code we sent you to confirm this password change.</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Verification Code</label>
              <input type="text" className="medicare-input" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="Enter code" />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleVerifyAndChangePassword} disabled={verifyingOtp || !otpCode} className="gap-2">
                {verifyingOtp ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                Confirm Password Change
              </Button>
              <Button variant="outline" onClick={handleCancelPasswordChange} disabled={verifyingOtp}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Two-Factor Authentication */}
      <TwoFactorSetup />

      {/* Trusted Devices */}
      <TrustedDevicesSection />

      {/* Activity Log */}
      <ActivityLog />

      {/* Danger zone */}
      <div className="medicare-card border-destructive/30 bg-destructive/5 space-y-4">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <AlertTriangle size={16} className="text-destructive" /> Account Actions
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Sign out of your account</p>
            <p className="text-xs text-muted-foreground mt-0.5">You'll need to sign in again to access your dashboard</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
            <LogOut size={14} />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
