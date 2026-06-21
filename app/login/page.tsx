import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { LoginForm } from "./LoginForm";
import { VantaLoginBackground } from "./VantaLoginBackground";

export default async function LoginPage() {
  if (await isAuthenticated()) {
    redirect("/");
  }

  return (
    <main className="login-screen">
      <VantaLoginBackground />
      <LoginForm />
    </main>
  );
}
