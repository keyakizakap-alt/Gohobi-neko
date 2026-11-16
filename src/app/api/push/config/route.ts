import { handleConfig } from "@/server/pushServer";

export function GET() {
  return handleConfig();
}
