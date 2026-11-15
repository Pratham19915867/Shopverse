import Shopverse from "@/components/shopverse";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getStore();
  return <Shopverse initialData={data} />;
}
