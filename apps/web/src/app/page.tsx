"use client";
import React from "react";
import { LandingPage } from "./components";
import { useRouter } from "next/navigation";

export default function LandingRoute() {
    const router = useRouter();
    return <LandingPage onGetStarted={() => router.push('/app')} />;
}
