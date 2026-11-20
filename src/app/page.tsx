import Dashboard from "@/components/dashboard";
import { DEMO_STREAMERS } from "@/lib/demo";

export default function HomePage() {
  return <Dashboard initialStreamers={DEMO_STREAMERS} />;
}
