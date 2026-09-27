"use server";

import { redirect } from "next/navigation";

export async function registerAdmin() {
  redirect("/admin/login");
}
