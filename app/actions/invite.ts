"use server";
import { createClient } from "@supabase/supabase-js";

function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Server actions are publicly reachable HTTP endpoints — every privileged
// action must verify the caller is an admin. Mirrors pm_is_admin() in the DB:
// admin if user_roles says owner/admin OR staff_members.pm_role = 'admin'.
async function verifyAdminCaller(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  callerToken: string | undefined
): Promise<{ ok: boolean; error?: string }> {
  if (!callerToken) return { ok: false, error: "Not signed in." };
  const { data: { user }, error } = await admin.auth.getUser(callerToken);
  if (error || !user) return { ok: false, error: "Could not verify session." };
  const [{ data: roleRow }, { data: staffRow }] = await Promise.all([
    admin.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    admin.from("staff_members").select("pm_role").eq("user_id", user.id).maybeSingle(),
  ]);
  const isAdmin = ["owner", "admin"].includes((roleRow?.role as string) ?? "") || staffRow?.pm_role === "admin";
  return isAdmin ? { ok: true } : { ok: false, error: "Admin access required." };
}

export async function inviteStaff(data: { name: string; email: string; callerToken: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();
    if (!admin) {
      return { success: false, error: "Server not configured for invites. Add SUPABASE_SERVICE_ROLE_KEY to .env.local." };
    }

    const auth = await verifyAdminCaller(admin, data.callerToken);
    if (!auth.ok) return { success: false, error: auth.error };

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

// Called after an invited user signs in for the first time. Links their auth
// account to the staff_members row created at invite time (user_id is NULL
// until now) and activates it. Without this, the invited row never gets a
// user_id: the member resolves to a nameless default profile, can't be
// assigned tasks (assignee dropdowns only list active staff), and any
// later identity becomes a dangling UUID. Idempotent — safe to call on
// every sign-in.
export async function linkStaffAccount(accessToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();
    if (!admin) {
      return { success: false, error: "Server not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local." };
    }

    // Verify the token server-side — never trust a client-supplied user id.
    // No admin check here: this only links the caller's OWN email-matched row.
    const { data: { user }, error: userErr } = await admin.auth.getUser(accessToken);
    if (userErr || !user?.email) {
      return { success: false, error: "Could not verify session." };
    }

    await admin
      .from("staff_members")
      .update({ user_id: user.id, status: "active" })
      .eq("email", user.email)
      .is("user_id", null);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error linking staff account.";
    return { success: false, error: message };
  }
}

export async function revokeStaff(data: { staffId: string; userId: string | null; email: string; callerToken: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();
    if (!admin) {
      return { success: false, error: "Server not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local." };
    }

    const auth = await verifyAdminCaller(admin, data.callerToken);
    if (!auth.ok) return { success: false, error: auth.error };

    // Find auth user by email if we don't have user_id yet (pending invite)
    let authUserId = data.userId;
    if (!authUserId) {
      const { data: { users } } = await admin.auth.admin.listUsers();
      authUserId = users.find((u) => u.email === data.email)?.id ?? null;
    }

    // Before deleting the auth user, reassign every task/project still
    // referencing this user so they don't point at a dead account forever.
    if (authUserId) {
      // Resolve a reassignment target. The revoked user may themselves hold an
      // owner/admin row in user_roles (this happened once and orphaned 38 tasks
      // on a dead UUID), so exclude them and verify the candidate still exists
      // as an active staff member.
      const [{ data: roleRows }, { data: adminStaff }] = await Promise.all([
        admin.from("user_roles").select("user_id, role").in("role", ["owner", "admin"]),
        admin.from("staff_members").select("user_id").eq("status", "active").eq("pm_role", "admin"),
      ]);
      const activeAdminIds = new Set(
        ((adminStaff ?? []) as { user_id: string | null }[])
          .map((s) => s.user_id)
          .filter((id): id is string => !!id && id !== authUserId)
      );
      const ownerId =
        ((roleRows ?? []) as { user_id: string; role: string }[])
          .filter((r) => r.user_id !== authUserId)
          .sort((a, b) => (a.role === "owner" ? -1 : 0) - (b.role === "owner" ? -1 : 0))
          .find((r) => activeAdminIds.has(r.user_id))?.user_id
        ?? [...activeAdminIds][0]
        ?? null;

      if (ownerId) {
        // Reassign tasks
        await admin
          .from("pm_tasks")
          .update({ assignee_id: ownerId })
          .eq("assignee_id", authUserId);
      } else {
        // No live admin found — unassign rather than leave a dangling dead id.
        // Admins see all tasks regardless, so nothing becomes invisible.
        await admin
          .from("pm_tasks")
          .update({ assignee_id: null })
          .eq("assignee_id", authUserId);
      }

      // Remove the revoked user from pm_projects.assigned_staff; hand the
      // projects to the reassignment target when we have one.
      const { data: affectedProjects } = await admin
        .from("pm_projects")
        .select("id, assigned_staff")
        .contains("assigned_staff", [authUserId]);

      for (const p of (affectedProjects ?? []) as { id: string; assigned_staff: string[] }[]) {
        const next = p.assigned_staff.filter((u) => u !== authUserId);
        if (ownerId && !next.includes(ownerId)) next.push(ownerId);
        await admin.from("pm_projects").update({ assigned_staff: next }).eq("id", p.id);
      }

      // Clean up any role rows for the revoked user. Leaving them behind both
      // grants admin if the same UUID ever reappears and corrupts the owner
      // lookup above for the next revocation.
      await admin.from("user_roles").delete().eq("user_id", authUserId);
    }

    // Delete from auth.users (revokes access permanently)
    if (authUserId) {
      const { error: authDelErr } = await admin.auth.admin.deleteUser(authUserId);
      // "User not found" is fine — they may already be gone from auth. Anything
      // else is a real error worth surfacing instead of silently moving on.
      if (authDelErr && !/not found/i.test(authDelErr.message)) {
        return { success: false, error: `Auth delete failed: ${authDelErr.message}` };
      }
    }

    // Delete from staff_members — check error explicitly. supabase-js does NOT
    // throw on PostgREST errors; it returns { error }. Without this check, a
    // failed delete (RLS, missing service_role, etc.) silently reports success
    // and the row stays in the table forever.
    const { error: staffDelErr, count } = await admin
      .from("staff_members")
      .delete({ count: "exact" })
      .eq("id", data.staffId);
    if (staffDelErr) {
      return { success: false, error: `Staff delete failed: ${staffDelErr.message}` };
    }
    if (count === 0) {
      return { success: false, error: "Staff record not found or could not be deleted (check RLS / service role)." };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error revoking staff.";
    return { success: false, error: message };
  }
}

// Admin sets/resets a staff member's password directly — no email link needed.
// This is the safe alternative to the admin clicking the invite link (which
// signs THEM in as the staff member and kicks out their own session, and
// consumes the one-time link). Also links + activates the staff row, since a
// password-bearing account is immediately usable.
export async function setStaffPassword(data: { staffId: string; newPassword: string; callerToken: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();
    if (!admin) {
      return { success: false, error: "Server not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local." };
    }

    const auth = await verifyAdminCaller(admin, data.callerToken);
    if (!auth.ok) return { success: false, error: auth.error };

    if ((data.newPassword ?? "").length < 8) {
      return { success: false, error: "Password must be at least 8 characters." };
    }

    const { data: staffRow, error: staffErr } = await admin
      .from("staff_members")
      .select("id, email, user_id")
      .eq("id", data.staffId)
      .maybeSingle();
    if (staffErr || !staffRow) return { success: false, error: "Staff member not found." };

    let authUserId = staffRow.user_id as string | null;
    if (!authUserId) {
      const { data: { users } } = await admin.auth.admin.listUsers();
      authUserId = users.find((u) => u.email === staffRow.email)?.id ?? null;
    }
    if (!authUserId) {
      return { success: false, error: "No auth account exists for this member yet — send an invite first." };
    }

    const { error: pwErr } = await admin.auth.admin.updateUserById(authUserId, {
      password: data.newPassword,
      email_confirm: true,
    });
    if (pwErr) return { success: false, error: pwErr.message };

    await admin
      .from("staff_members")
      .update({ user_id: authUserId, status: "active" })
      .eq("id", staffRow.id);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error setting password.";
    return { success: false, error: message };
  }
}
