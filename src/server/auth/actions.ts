"use server";

import { redirect } from "next/navigation";

import { deleteCurrentSession } from "./session";

export async function logout() {
  await deleteCurrentSession();
  redirect("/entrar");
}
