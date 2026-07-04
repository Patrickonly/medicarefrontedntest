import { api } from "@/lib/api";

export interface ApiOrganizationType {
  id: string;
  name: string;
}

// Fetched once per session from the existing public GET /api/organization-types
// (already used at registration) so any organization_type_id can resolve to its
// real name - the session/profile responses only carry the org's numeric
// organization_type_id, never the type name itself.
let orgTypeDirectoryCache: Record<string, string> | null = null;
let orgTypeDirectoryPromise: Promise<Record<string, string>> | null = null;

export const ensureOrganizationTypeDirectory = async (): Promise<Record<string, string>> => {
  if (orgTypeDirectoryCache) return orgTypeDirectoryCache;
  if (!orgTypeDirectoryPromise) {
    orgTypeDirectoryPromise = api
      .get<{ success: boolean; data: ApiOrganizationType[] }>("/api/organization-types")
      .then((res) => {
        const map: Record<string, string> = {};
        (res.data || []).forEach((t) => {
          map[String(t.id)] = t.name;
        });
        orgTypeDirectoryCache = map;
        return map;
      })
      .catch(() => ({}));
  }
  return orgTypeDirectoryPromise;
};

/** True if the resolved organization type name is the agrovet tenant type
 * ("Agrovet Pharmacy"). Matches on name substring rather than a hardcoded id,
 * since the id can differ across environments/seeds. */
export const isAgrovetTypeName = (name: string | null | undefined): boolean =>
  !!name && name.toLowerCase().includes("agrovet");
