"use server";

import { headers } from "next/headers";
import { randomUUID } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { accountTable, collaboratorTable, userTable } from "@/db/schema";
import { assertRepoInInstallation } from "@/lib/repo-installation";
import { normalizeEmail } from "@/lib/collaborator-access";

// Client logins: email + password accounts created by the agency (a GitHub
// user with write access to the repo). Public sign-up stays disabled in
// lib/auth.ts, so this is the only way a password account comes to exist.
// Access to a site is the same collaborator row the email-invite flow uses.

const MIN_PASSWORD_LENGTH = 8;
const CREDENTIAL_PROVIDER = "credential";

const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(128, "Password is too long.");

const requireAgencyUser = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) throw new Error("You must be signed in with GitHub to manage client logins.");
  return user;
};

// Sets (or replaces) the password on a user's credential account.
const setPassword = async (userId: string, password: string) => {
  const hash = await hashPassword(password);
  const existing = await db.query.accountTable.findFirst({
    where: and(
      eq(accountTable.userId, userId),
      eq(accountTable.providerId, CREDENTIAL_PROVIDER),
    ),
  });

  if (existing) {
    await db
      .update(accountTable)
      .set({ password: hash, updatedAt: new Date() })
      .where(eq(accountTable.id, existing.id));
    return;
  }

  await db.insert(accountTable).values({
    id: randomUUID(),
    accountId: userId,
    providerId: CREDENTIAL_PROVIDER,
    userId,
    password: hash,
  });
};

const handleCreateClientLogin = async (prevState: any, formData: FormData) => {
  try {
    const user = await requireAgencyUser();

    const parsed = z
      .object({
        owner: z.string().trim().min(1),
        repo: z.string().trim().min(1),
        name: z.string().trim().min(1, "Enter the client's name.").max(100),
        email: z.string().trim().email("Enter a valid email address."),
        password: passwordSchema,
      })
      .safeParse({
        owner: formData.get("owner"),
        repo: formData.get("repo"),
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
      });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Invalid details.");

    const { owner, repo, name, password } = parsed.data;
    const email = normalizeEmail(parsed.data.email);
    const { repoAccess, installation } = await assertRepoInInstallation(user, owner, repo);

    let clientUser = await db.query.userTable.findFirst({
      where: sql`lower(${userTable.email}) = lower(${email})`,
    });

    if (clientUser?.githubUsername) {
      throw new Error(`${email} belongs to a GitHub account. Use a different email for the client login.`);
    }

    if (clientUser) {
      await db
        .update(userTable)
        .set({ name, emailVerified: true, updatedAt: new Date() })
        .where(eq(userTable.id, clientUser.id));
    } else {
      const inserted = await db
        .insert(userTable)
        .values({ id: randomUUID(), name, email, emailVerified: true })
        .returning();
      clientUser = inserted[0];
    }

    await setPassword(clientUser.id, password);

    const existingCollaborator = await db.query.collaboratorTable.findFirst({
      where: and(
        sql`lower(${collaboratorTable.owner}) = lower(${repoAccess.ownerLogin})`,
        sql`lower(${collaboratorTable.repo}) = lower(${repoAccess.repoName})`,
        sql`lower(${collaboratorTable.email}) = lower(${email})`,
      ),
    });

    const collaborator = existingCollaborator
      ? (
        await db
          .update(collaboratorTable)
          .set({ userId: clientUser.id })
          .where(eq(collaboratorTable.id, existingCollaborator.id))
          .returning()
      )[0]
      : (
        await db
          .insert(collaboratorTable)
          .values({
            type: repoAccess.ownerType,
            installationId: installation.id,
            ownerId: repoAccess.ownerId,
            repoId: repoAccess.repoId,
            owner: repoAccess.ownerLogin,
            repo: repoAccess.repoName,
            email,
            userId: clientUser.id,
            invitedBy: user.id,
          })
          .returning()
      )[0];

    return {
      message: existingCollaborator
        ? `Login for ${email} updated with the new password.`
        : `Login created for ${email}.`,
      data: [{ id: collaborator.id, email: collaborator.email }],
    };
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
};

const handleResetClientPassword = async (
  collaboratorId: number,
  owner: string,
  repo: string,
  password: string,
) => {
  try {
    const user = await requireAgencyUser();
    const parsedPassword = passwordSchema.safeParse(password);
    if (!parsedPassword.success) throw new Error(parsedPassword.error.issues[0]?.message);

    await assertRepoInInstallation(user, owner, repo);

    const collaborator = await db.query.collaboratorTable.findFirst({
      where: and(
        eq(collaboratorTable.id, collaboratorId),
        sql`lower(${collaboratorTable.owner}) = lower(${owner})`,
        sql`lower(${collaboratorTable.repo}) = lower(${repo})`,
      ),
    });
    if (!collaborator) throw new Error("Client login not found.");

    const clientUser = await db.query.userTable.findFirst({
      where: sql`lower(${userTable.email}) = lower(${collaborator.email})`,
    });
    if (!clientUser) throw new Error("This person has not got a login yet. Create one instead.");
    if (clientUser.githubUsername) throw new Error("This person signs in with GitHub and has no password.");

    await setPassword(clientUser.id, parsedPassword.data);
    if (!collaborator.userId) {
      await db
        .update(collaboratorTable)
        .set({ userId: clientUser.id })
        .where(eq(collaboratorTable.id, collaborator.id));
    }

    return { message: `Password updated for ${collaborator.email}.` };
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
};

export { handleCreateClientLogin, handleResetClientPassword };
