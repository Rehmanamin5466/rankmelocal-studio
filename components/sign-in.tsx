"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { getAuthCallbackURL, getSafeRedirect } from "@/lib/auth-redirect";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { toast } from "sonner";
import { Eye, EyeOff, Loader } from "lucide-react";

// Client-facing sign-in. Clients use the email + password the agency created
// for them on the Client logins screen; the agency itself signs in with GitHub.
export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submittingMethod, setSubmittingMethod] = useState<"github" | "password" | null>(null);
  const isSubmitting = submittingMethod !== null;

  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "";
  const redirectParam = searchParams.get("redirect") || "";
  const safeRedirect = getSafeRedirect(redirectParam);
  const callbackURL = getAuthCallbackURL(safeRedirect);
  const errorCallbackURL =
    safeRedirect === "/"
      ? "/sign-in"
      : `/sign-in?redirect=${encodeURIComponent(safeRedirect)}`;

  const getErrorMessage = (value: string) => {
    if (value.toLowerCase() !== "unable_to_get_user_info") return value;
    return [
      "GitHub denied profile access. Re-authorize Rank Me Local Studio in GitHub Settings > Applications > Authorized GitHub Apps, then try again.",
      "https://github.com/settings/applications",
    ].join(" ");
  };

  useEffect(() => {
    if (error) toast.error(getErrorMessage(error), { duration: 12000 });
  }, [error]);

  useEffect(() => {
    const email = searchParams.get("email");
    if (email) setEmail(email.trim().toLowerCase());
  }, [searchParams]);

  const handlePasswordSignIn = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      toast.error("Enter your email and password.");
      return;
    }

    setSubmittingMethod("password");
    try {
      const result = await signIn.email({ email: normalizedEmail, password });
      if (result.error) {
        toast.error(
          result.error.status === 401 || result.error.code === "INVALID_EMAIL_OR_PASSWORD"
            ? "That email and password don't match. Check them and try again."
            : result.error.message || "Could not sign in. Please try again.",
        );
        return;
      }
      window.location.assign(safeRedirect);
    } catch (error: any) {
      toast.error(error?.message || "Could not sign in. Please try again.");
    } finally {
      setSubmittingMethod(null);
    }
  };

  const handleGithubSignIn = async () => {
    setSubmittingMethod("github");
    try {
      const result = await signIn.social({
        provider: "github",
        callbackURL,
        errorCallbackURL,
        disableRedirect: true,
      });
      if (result.error?.message) {
        toast.error(result.error.message);
        setSubmittingMethod(null);
        return;
      }

      if (result.data?.url) {
        window.location.assign(result.data.url);
        return;
      }

      setSubmittingMethod(null);
      toast.error("Could not start GitHub sign-in. Please try again.");
    } catch (error: any) {
      toast.error(error?.message || "Could not start GitHub sign-in.");
      setSubmittingMethod(null);
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-muted p-4 md:p-6 flex justify-center items-center">
      <div className="w-full sm:max-w-[380px] space-y-6">
        <div className="flex items-center justify-center gap-3">
          <span className="bg-primary text-primary-foreground rounded-xl size-11 flex items-center justify-center">
            <BrandMark className="size-7" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-2xl">Rank Me Local</p>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Studio
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight">Sign in to edit your website</h1>
            <p className="text-sm text-muted-foreground">
              Use the email and password we gave you.
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              await handlePasswordSignIn();
            }}
          >
            <div className="space-y-1.5">
              <label htmlFor="sign-in-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="sign-in-email"
                type="email"
                name="email"
                autoComplete="username"
                required
                disabled={isSubmitting}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sign-in-password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Input
                  id="sign-in-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                </button>
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              Sign in
              {submittingMethod === "password" && <Loader className="size-4 animate-spin" />}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground">
            Forgotten your password? Contact Rank Me Local and we&apos;ll reset it for you.
          </p>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Rank Me Local team?{" "}
          <button
            type="button"
            onClick={handleGithubSignIn}
            disabled={isSubmitting}
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary disabled:opacity-50"
          >
            Sign in with GitHub
          </button>
          {submittingMethod === "github" && <Loader className="ml-1 inline size-3.5 animate-spin" />}
        </p>
      </div>
    </div>
  );
}
