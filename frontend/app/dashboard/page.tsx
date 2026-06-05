import { redirect } from "next/navigation";

/**
 * The public dashboard has been moved into the admin panel.
 * Redirect anyone who hits /dashboard to the protected admin area.
 */
export default function DashboardPage() {
  redirect("/admin/blog");
}
