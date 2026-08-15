import { redirect } from "next/navigation";

// This route group page at / conflicts with app/page.tsx.
// The actual login is at /login — redirect there.
export default function AuthGroupRoot() {
  redirect("/login");
}
