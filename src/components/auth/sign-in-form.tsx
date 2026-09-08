import { getAuthProvider } from "@/lib/auth/provider";
import { SignInFormSupabase } from "./sign-in-form-supabase";
import { SignInFormClerk } from "./sign-in-form-clerk";

export async function SignInForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const provider = await getAuthProvider();
  
  if (provider === "clerk") {
    return <SignInFormClerk next={next} linkError={linkError} />;
  }
  
  return <SignInFormSupabase next={next} linkError={linkError} />;
}
