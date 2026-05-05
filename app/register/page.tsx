import { redirect } from "next/navigation";

/** Публична регистрация е изключена — само вход и админ поток. */
export default function RegisterRemovedPage() {
  redirect("/login");
}
