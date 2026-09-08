"use client";

import * as React from "react";
import { useSignUp, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SignUpPage() {
  const { isLoaded, signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  
  const [pendingVerification, setPendingVerification] = React.useState(false);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    const formData = new FormData(e.currentTarget);
    const emailAddress = formData.get("email") as string;
    const password = formData.get("password") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;

    const { error: signUpError } = await signUp.password({
      emailAddress,
      password,
      firstName,
      lastName,
    });

    if (!signUpError) {
      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (!sendError) {
        setPendingVerification(true);
      } else {
        console.error("Failed to send code:", sendError);
      }
    } else {
      console.error("Sign-up error:", signUpError);
    }
  };

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    const formData = new FormData(e.currentTarget);
    const code = formData.get("code") as string;

    const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code });
    
    if (verifyError) {
      console.error("Verification error:", verifyError);
      return;
    }

    if (signUp.status === "complete") {
      await signUp.finalize({
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
    }
  };

  if (!isLoaded) {
    return <div className="flex min-h-screen items-center justify-center text-steel">Loading...</div>;
  }

  if (signUp.status === "complete" || isSignedIn) {
    return null; // or redirect
  }

  if (pendingVerification) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>We sent a verification code to your email address.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input id="code" name="code" type="text" required placeholder="Enter code" />
                {errors?.fields?.code && (
                  <p className="text-sm text-red-500">{errors.fields.code.message}</p>
                )}
              </div>

              {errors?.global && errors.global.length > 0 && (
                <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                  {errors.global[0].message}
                </div>
              )}

              <Button type="submit" disabled={fetchStatus === "fetching"} className="mt-2">
                {fetchStatus === "fetching" ? "Verifying..." : "Verify Account"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <Button 
              type="button"
              variant="link" 
              onClick={() => signUp.verifications.sendEmailCode()}
              disabled={fetchStatus === "fetching"}
              className="text-steel"
            >
              Resend code
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Sign up to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" name="firstName" type="text" required />
                {errors?.fields?.firstName && (
                  <p className="text-sm text-red-500">{errors.fields.firstName.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" name="lastName" type="text" required />
                {errors?.fields?.lastName && (
                  <p className="text-sm text-red-500">{errors.fields.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" name="email" type="email" required />
              {errors?.fields?.emailAddress && (
                <p className="text-sm text-red-500">{errors.fields.emailAddress.message}</p>
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
              {fetchStatus === "fetching" ? "Creating account..." : "Continue"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-steel">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-enamel underline font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
      <div id="clerk-captcha" />
    </div>
  );
}
