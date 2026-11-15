import { getStore } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(await getStore(), { headers: { "Cache-Control": "private, no-store" } });
}
