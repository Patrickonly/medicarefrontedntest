import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Building2, Loader2, Upload, ImageOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function EditOrganizationPage() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    type: "healthcare",
    status: "active",
    logo_url: "",
  });
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [isReadingLogo, setIsReadingLogo] = useState(false);

  // The admin org API is list-based, so we load the list and find this org.
  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["admin_organizations"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/admin/organizations");
      return res.data || [];
    },
  });

  const org = organizations.find((o: any) => String(o.id) === String(id));

  useEffect(() => {
    if (org) {
      setFormData({
        name: org.name || "",
        email: org.email || "",
        phone: org.phone || "",
        type: org.type || "healthcare",
        status: org.status || "active",
        logo_url: org.logo_url || "",
      });
      setLogoPreview(org.logo_url || "");
    }
  }, [org]);

  const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB — kept small since it's stored inline as base64 in the DB.

  const handleLogoSelect = (file: File | null) => {
    if (!file) return;

    if (file.size > MAX_LOGO_BYTES) {
      error("Image too large", "Please choose an image under 2MB.");
      return;
    }

    setIsReadingLogo(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoPreview(dataUrl);
      setFormData((prev) => ({ ...prev, logo_url: dataUrl }));
      setIsReadingLogo(false);
    };
    reader.onerror = () => {
      error("Read failed", "Could not read the selected image.");
      setIsReadingLogo(false);
    };
    reader.readAsDataURL(file);
  };

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await api.put<{ success: boolean; data: any }>("/api/admin/organizations", { ...org, ...data, id });
      return res.data;
    },
    onSuccess: () => {
      success("Organization updated", `${formData.name} was updated successfully.`);
      queryClient.invalidateQueries({ queryKey: ["admin_organizations"] });
      navigate("/dashboard/organizations");
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to update organization.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      error("Error", "Organization name is required.");
      return;
    }
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0aa9ad]" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="mx-auto max-w-[1600px] p-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard/organizations")} className="mb-4 -ml-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Organizations
        </Button>
        <Card className="rounded-2xl border-border p-10 text-center text-muted-foreground shadow-sm">
          Organization not found.
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] p-6">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/organizations")}
          className="mb-4 -ml-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Organizations
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Edit Organization</h1>
        <p className="text-sm text-muted-foreground">Update the details for {org.name}.</p>
      </div>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader className="rounded-t-2xl border-b border-border bg-background/50 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Building2 className="h-5 w-5 text-[#0aa9ad]" /> Organization Details
          </CardTitle>
          <CardDescription>Update the organization's contact details and type.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label className="font-medium text-slate-700">Organization Logo</Label>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background/50">
                  {logoPreview ? (
                    <img src={logoPreview} alt={`${formData.name || "Organization"} logo`} className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff className="h-7 w-7 text-slate-300" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    title="Upload organization logo"
                    aria-label="Upload organization logo"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={(e) => handleLogoSelect(e.target.files?.[0] || null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    disabled={isReadingLogo}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isReadingLogo ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reading...</>
                    ) : (
                      <><Upload className="mr-2 h-4 w-4" /> {logoPreview ? "Change Logo" : "Upload Logo"}</>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP, under 2MB. Saved when you click "Save Changes".</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="name" className="font-medium text-slate-700">
                Organization Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                required
                placeholder="e.g. Kigali Central Hospital"
                className="rounded-xl border-border focus-visible:ring-[#0aa9ad]"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Label htmlFor="type" className="font-medium text-slate-700">Type</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                  <SelectTrigger className="rounded-xl border-border focus:ring-[#0aa9ad]">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="agrovet">Agrovet</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="clinic">Clinic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="status" className="font-medium text-slate-700">Status</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                  <SelectTrigger className="rounded-xl border-border focus:ring-[#0aa9ad]">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="font-medium text-slate-700">Primary Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@organization.com"
                  className="rounded-xl border-border focus-visible:ring-[#0aa9ad]"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="phone" className="font-medium text-slate-700">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+250 788 123 456"
                  className="rounded-xl border-border focus-visible:ring-[#0aa9ad]"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-6">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => navigate("/dashboard/organizations")}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-[#0aa9ad] text-white shadow-md shadow-teal-900/10 hover:bg-[#07969a]"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
