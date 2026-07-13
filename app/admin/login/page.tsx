import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLogin } from "@/components/AdminLogin";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };
export default function LoginPage() { return <Suspense><AdminLogin /></Suspense>; }
