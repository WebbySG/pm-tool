"use server";
import { createClient } from "@supabase/supabase-js";

export async function inviteStaff(data: { name: string; email: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return { success: false, error: "Server not configured for invites. Add SUPABASE_SERVICE_ROLE_KEY to .env.local." };
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const nameParts = data.name.trim().split(" ");
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ");
    const avatar = (firstName[0] + (lastName[0] ?? "")).toUpperCase() || "?";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(data.email, {
      data: { first_name: firstName, last_name: lastName, pm_role: "staff" },
      redirectTo: `${appUrl}/auth/callback`,
    });

    if (inviteError) {
      // Give friendly messages for common cases
      if (inviteError.message.includes("already been invited") || inviteError.message.includes("already registered")) {
        return { success: false, error: "This email has already been invited or has an existing account." };
      }
      return { success: false, error: inviteError.message };
    }

    await admin
      .from("staff_members")
      .upsert(
        {
          email: data.email,
          first_name: firstName,
          last_name: lastName || null,
          avatar_initials: avatar,
          pm_role: "staff",
          status: "invited",
        },
        { onConflict: "email" }
      );

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error sending invite.";
    return { success: false, error: message };
  }
}
