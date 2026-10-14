"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { DEMO_EMAIL, isDemoUser } from "@/lib/demo/config";
import { auth, hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/auth/utils";
import { redirect } from "next/navigation";

export type RegisterState = {
  errors?: Partial<Record<"name" | "email" | "password" | "confirmPassword", string[]>>;
  message?: string;
};

export async function registerAction(
  _previousState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  if (isDemoUser((await auth())?.user?.id)) return { message: "Sign out of the demo to create your own account." };
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password } = parsed.data;
  if (email.toLowerCase() === DEMO_EMAIL) return { errors: { email: ["This email belongs to the demo. Use the demo sign-in button or enter your own email."] } };
  try {
    const existingUser = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.email, email.toLowerCase()),
    });
    if (existingUser) {
      return { errors: { email: ["This email is already registered. Sign in instead."] } };
    }

    const passwordHash = await hashPassword(password);
    const created = await db.insert(users).values({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "operator",
    }).onConflictDoNothing({ target: users.email }).returning({ id: users.id });

    if (created.length === 0) {
      return { errors: { email: ["This email is already registered. Sign in instead."] } };
    }
  } catch (error) {
    console.error("Failed to create account", error);
    return { message: "We couldn’t create your account. Please try again." };
  }

  redirect("/login?registered=1");
}
