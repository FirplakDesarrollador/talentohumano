import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trigger, x-log-id",
};

async function getMsToken(): Promise<string> {
  const tenantId = Deno.env.get("MICROSOFT_TENANT_ID")!;
  const clientId = Deno.env.get("MICROSOFT_CLIENT_ID")!;
  const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET")!;
  const params = new URLSearchParams({
    client_id: clientId, client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials",
  });
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params }
  );
  if (!res.ok) throw new Error(`Token error: ${await res.text()}`);
  return (await res.json()).access_token;
}

async function graphGet(token: string, url: string): Promise<any> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Graph error [${res.status}]: ${await res.text()}`);
  return res.json();
}

async function graphGetAll(token: string, url: string): Promise<any[]> {
  let items: any[] = [], nextUrl: string | null = url;
  while (nextUrl) {
    const page = await graphGet(token, nextUrl);
    items = items.concat(page.value || []);
    nextUrl = page["@odata.nextLink"] || null;
  }
  return items;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let skip = 0;
  try { const b = await req.json(); if (typeof b.skip === 'number') skip = b.skip; } catch (_) {}

  const logIdStr = req.headers.get("x-log-id");
  let logId = logIdStr ? parseInt(logIdStr) : null;
  const isCron = req.headers.get("x-trigger") === "cron";

  if (skip === 0 && !logId) {
    const { data: logRow } = await supabase.from("planner_sync_log")
      .insert({ status: "running", triggered_by: isCron ? "cron" : "manual" })
      .select("id").single();
    logId = logRow?.id;
  }

  const counts = { planes: 0, tasks: 0 };
  const processedUsers = new Set<string>();

  try {
    const token = await getMsToken();

    // Use proper pagination to get ALL groups (no top limit filter)
    const allGroups = await graphGetAll(token,
      "https://graph.microsoft.com/v1.0/groups?$select=id,displayName,groupTypes&$top=100"
    );

    const BATCH = 5;
    const targetGroups = allGroups.slice(skip, skip + BATCH);
    console.log(`[sync-planner] Batch ${skip}-${skip+BATCH} of ${allGroups.length} total groups`);

    if (targetGroups.length > 0) {
      const { data: eu } = await supabase.from('planner_users').select('id');
      eu?.forEach(u => processedUsers.add(u.id));

      for (const grpChunk of chunk(targetGroups, 5)) {
        const results = await Promise.all(grpChunk.map(async (group) => {
          try {
            const plans = await graphGetAll(token, `https://graph.microsoft.com/v1.0/groups/${group.id}/planner/plans`);
            return { group, plans };
          } catch (_) { return { group, plans: [] }; }
        }));

        for (const { group, plans } of results) {
          for (const plan of plans) {
            await supabase.from("planner_planes").upsert({
              id: plan.id, title: plan.title,
              owner_group_id: group.id, owner_group_name: group.displayName,
              created_date_time: plan.createdDateTime || null,
              raw_data: plan, synced_at: new Date().toISOString(),
            }, { onConflict: "id" });
            counts.planes++;

            let buckets: any[] = [];
            try { buckets = await graphGetAll(token, `https://graph.microsoft.com/v1.0/planner/plans/${plan.id}/buckets`); } catch (_) {}
            for (const b of buckets) {
              await supabase.from("planner_buckets").upsert({
                id: b.id, name: b.name, plan_id: plan.id,
                order_hint: b.orderHint || null, raw_data: b, synced_at: new Date().toISOString(),
              }, { onConflict: "id" });
            }

            let tasks: any[] = [];
            try { tasks = await graphGetAll(token, `https://graph.microsoft.com/v1.0/planner/plans/${plan.id}/tasks`); } catch (_) {}

            for (const tChunk of chunk(tasks, 8)) {
              await Promise.all(tChunk.map(async (task) => {
                let checklistTotal = task.checklistItemCount || 0;
                let checklistDone = checklistTotal - (task.activeChecklistItemCount || 0);
                let refsCount = task.referenceCount || 0;
                // We skip fetching the detailed description to avoid N+1 API requests which cause timeouts.
                let description = task.hasDescription ? "Contiene descripción (Ver en Planner)" : "";

                await supabase.from("planner_tasks").upsert({
                  id: task.id, plan_id: plan.id, bucket_id: task.bucketId || null,
                  title: task.title, percent_complete: task.percentComplete || 0, priority: task.priority ?? 5,
                  created_date_time: task.createdDateTime || null,
                  start_date_time: task.startDateTime || null,
                  due_date_time: task.dueDateTime || null,
                  completed_date_time: task.completedDateTime || null,
                  created_by_user_id: task.createdBy?.user?.id || null,
                  completed_by_user_id: task.completedBy?.user?.id || null,
                  checklist_item_count: checklistTotal, checklist_checked_count: checklistDone,
                  description, references_count: refsCount,
                  raw_data: task, synced_at: new Date().toISOString(),
                }, { onConflict: "id" });
                counts.tasks++;

                await Promise.all(Object.entries(task.assignments || {}).map(async ([userId, ad]: [string, any]) => {
                  if (!processedUsers.has(userId)) {
                    try {
                      const u = await graphGet(token, `https://graph.microsoft.com/v1.0/users/${userId}?$select=id,displayName,mail,userPrincipalName`);
                      await supabase.from("planner_users").upsert({
                        id: u.id, display_name: u.displayName || null,
                        mail: u.mail || null, user_principal_name: u.userPrincipalName || null,
                        synced_at: new Date().toISOString(),
                      }, { onConflict: "id" });
                    } catch (_) {}
                    processedUsers.add(userId);
                  }
                  await supabase.from("planner_task_assignments").upsert({
                    task_id: task.id, user_id: userId,
                    assigned_at: ad.assignedDateTime || null, order_hint: ad.orderHint || null,
                  }, { onConflict: "task_id,user_id" });
                }));
              }));
            }
          }
        }
      }
    }

    const nextSkip = skip + BATCH;
    const isFinished = nextSkip >= allGroups.length;

    if (isFinished && logId) {
      await supabase.from("planner_sync_log").update({
        status: "success", finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }

    // Auto-trigger the next batch if this was a cron job
    if (!isFinished && isCron) {
      console.log(`[sync-planner] Triggering next batch for cron job...`);
      // Use edge function self invocation pattern
      const authHeader = req.headers.get('Authorization') || `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`;
      fetch(`${supabaseUrl}/functions/v1/sync-planner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
          "x-trigger": "cron",
          "x-log-id": logId ? logId.toString() : ""
        },
        body: JSON.stringify({ skip: nextSkip })
      }).catch(err => console.error("Auto-trigger failed", err));
    }

    return new Response(JSON.stringify({ success: true, counts, isFinished, nextSkip, totalGroups: allGroups.length, logId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    if (logId) await supabase.from("planner_sync_log").update({
      status: "error", finished_at: new Date().toISOString(), error_message: error.message,
    }).eq("id", logId);
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
