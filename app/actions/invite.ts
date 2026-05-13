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

    // Remove any auto-assigned role the DB trigger may have created for this user.
    // Staff must never appear in user_roles — that table is for admins/owners only.
    const { data: { users } } = await admin.auth.admin.listUsers();
    const invitedUser = users.find((u) => u.email === data.email);
    if (invitedUser) {
      await admin.from("user_roles").delete().eq("user_id", invitedUser.id);
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

export async function revokeStaff(data: { staffId: string; userId: string | null; email: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return { success: false, error: "Server not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local." };
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find auth user by email if we don't have user_id yet (pending invite)
    let authUserId = data.userId;
    if (!authUserId) {
      const { data: { users } } = await admin.auth.admin.listUsers();
      authUserId = users.find((u) => u.email === data.email)?.id ?? null;
    }

    // Before deleting the auth user, reassign every task/project still
    // referencing this user to the owner so they don't become invisible.
    if (authUserId) {
      const { data: ownerRow } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", "owner")
        .limit(1)
        .maybeSingle();
      const ownerId = ownerRow?.user_id as string | undefined;

      if (ownerId) {
        // Reassign tasks
        await admin
          .from("pm_tasks")
          .update({ assignee_id: ownerId })
          .eq("assignee_id", authUserId);

        // Replace in pm_projects.assigned_staff via RPC-style raw SQL.
        // assigned_staff is text[]; remove the revoked UUID and add owner if missing.
        const { data: affectedProjects } = await admin
          .from("pm_projects")
          .select("id, assigned_staff")
          .contains("assigned_staff", [authUserId]);

        for (const p of (affectedProjects ?? []) as { id: string; assigned_staff: string[] }[]) {
          const next = p.assigned_staff.filter((u) => u !== authUserId);
          if (!next.includes(ownerId)) next.push(ownerId);
          await admin.from("pm_projects").update({ assigned_staff: next }).eq("id", p.id);
        }
      }
    }

    // Delete from auth.users (revokes access permanently)
    if (authUserId) {
      await admin.auth.admin.deleteUser(authUserId);
    }

    // Delete from staff_members
    await admin.from("staff_members").delete().eq("id", data.staffId);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error revoking staff.";
    return { success: false, error: message };
  }
}
