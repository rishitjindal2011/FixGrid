"use client";

import * as React from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  const { isLoaded, signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    const formData = new FormData(e.currentTarget);
    const emailAddress = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await signIn.password({
        identifier: emailAddress,
        password,
      });

      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              console.log("Session task pending", session.currentTask);
              return;
            }
            const url = decorateUrl("/");
            if (url.startsWith("http")) {
              window.location.href = url;
            } else {
              router.push(url);
            }
          },
        });
      } else {
        // e.g. needs_second_factor, needs_client_trust
        console.log("Sign in status:", signIn.status);
      }
    } catch (err) {
      console.error("Sign-in error", err);
    }
  };

  if (!isLoaded) {
    return <div className="flex min-h-screen items-center justify-center text-steel">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" name="email" type="email" required />
              {errors?.fields?.identifier && (
                <p className="text-sm text-red-500">{errors.fields.identifier.message}</p>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
              {errors?.fields?.password && (
                <p className="text-sm text-red-500">{errors.fields.password.message}</p>
              )}
            </div>

            {errors?.global && errors.global.length > 0 && (
              <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                {errors.global[0].message}
              </div>
            )}

            <Button type="submit" disabled={fetchStatus === "fetching"} className="mt-2">
              {fetchStatus === "fetching" ? "Signing in..." : "Continue"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-steel">
            Don't have an account?{" "}
            <Link href="/sign-up" className="text-enamel underline font-medium">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
