import { LoginForm } from "@/components/auth/login-form";
import { isDemoEnabled } from "@/lib/demo/config";
import { signIn } from "@/lib/auth";
import { loginSchema } from "@/lib/auth/utils";
import { isOAuthEnabled } from "@/lib/auth";
import { AuthError } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registered?: string; demo?: string }>;
}) {
  const { error, registered, demo } = await searchParams;

  async function loginAction(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const validatedFields = loginSchema.safeParse({ email, password });

    if (!validatedFields.success) {
      redirect("/login?error=Invalid credentials");
    }

    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: "/dashboard",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect("/login?error=Invalid email or password");
      }
      throw err;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">AutoPost</h1>
            <p className="text-sm text-neutral-500 mt-2">
              Sign in to your account
            </p>
          </div>

          {registered === "1" && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Your account is ready. Sign in to get started.</p>}

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <LoginForm action={loginAction} demoEnabled={isDemoEnabled()} fillDemo={demo === "1" && isDemoEnabled()} />

          {isOAuthEnabled() && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-neutral-500">
                    Or continue with
                  </span>
                </div>
              </div>

              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/dashboard" });
                }}
              >
                <button
                  type="submit"
                  className="w-full border border-neutral-300 bg-white py-2 px-4 rounded-md hover:bg-neutral-50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-neutral-500 mt-6">
            Don’t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-neutral-900 hover:text-neutral-700"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
