import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

/** Shown when Supabase env vars are missing, so the app renders instead of crashing. */
export function SetupNotice() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-4 w-4" /> Finish setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>Connect a Supabase project to bring the tournament to life:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Create a project at supabase.com.</li>
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code> and fill in the keys.
          </li>
          <li>
            Run <code>supabase/schema.sql</code> in the SQL editor.
          </li>
          <li>
            Run <code>npm run db:seed</code> to add the players.
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}
