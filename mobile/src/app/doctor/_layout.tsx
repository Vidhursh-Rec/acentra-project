import { Redirect, Stack } from "expo-router";

import { useSession } from "@/lib/session";

export default function DoctorLayout() {
  const { session } = useSession();
  if (session?.role !== "doctor") return <Redirect href="/login" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#ffffff" } }} />;
}
