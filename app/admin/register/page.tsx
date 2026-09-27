import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminRegisterPage() {
  redirect("/admin/login");
}
