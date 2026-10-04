import { localDb } from "@/lib/localDb/client";

export type SetupStatus = {
  companyConfigured: boolean;
  adminExists: boolean;
};

export async function getSetupStatus(): Promise<SetupStatus> {
  const { data, error } = await localDb.functions.invoke("complete-onboarding", {
    method: "GET",
  });

  if (error) {
    console.error("Erreur statut configuration:", error);
    return { companyConfigured: true, adminExists: true };
  }

  return {
    companyConfigured: Boolean((data as any)?.companyConfigured),
    adminExists: Boolean((data as any)?.adminExists),
  };
}