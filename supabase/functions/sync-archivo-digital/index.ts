import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trigger",
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

function eliminarAcentos(s: string): string {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-]+/g, "_");
}

// El correo cuyo OneDrive contiene la carpeta maestra "ARCHIVO DIGITAL"
// (compartida/administrada por Talento Humano, no personal de este usuario).
const UPN = "renata.lainez@firplak.com";
const BUCKET = "archivo-digital";

// Alcance inicial: solo las dos categorias que tienen la estructura de 4
// subcarpetas por empleado (Contrato/Correspondencia/Documentos/Procesos
// disciplinarios). Las demas categorias (Terceros, Minutas, Incapacidades,
// etc.) no siguen ese patron y quedan fuera de este sync por ahora.
const CATEGORIAS = [
  { driveFolder: "1.ACTIVOS", categoria: "ACTIVOS" },
  { driveFolder: "2.RETIRADOS", categoria: "RETIRADOS" },
];
const SUBCARPETAS = ["Contrato", "Correspondencia", "Documentos", "Procesos disciplinarios"];

// Cuantas carpetas de empleado se procesan antes de auto-encadenar a la
// siguiente invocacion (cada categoria tiene cientos de carpetas: 1.ACTIVOS
// solo ya tiene 324).
const BATCH_EMPLEADOS = 8;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let categoriaIndex = 0;
  let employeeIndex = 0;
  let subfolderIndex = 0;
  let filesUrl: string | null = null;
  let logId: number | null = null;

  try {
    const b = await req.json();
    if (typeof b.categoriaIndex === "number") categoriaIndex = b.categoriaIndex;
    if (typeof b.employeeIndex === "number") employeeIndex = b.employeeIndex;
    if (typeof b.subfolderIndex === "number") subfolderIndex = b.subfolderIndex;
    if (typeof b.filesUrl === "string") filesUrl = b.filesUrl;
    if (typeof b.logId === "number") logId = b.logId;
  } catch (_) { /* body vacio en la primera llamada del boton */ }

  // Sin logId: es una llamada de entrada (boton "Sincronizar"). Si ya hay una
  // corrida en curso, retomarla desde su cursor en vez de arrancar otra en
  // paralelo; si no, crear una nueva (protegido por el indice unico
  // archivo_digital_sync_log_one_running contra una carrera con otro click).
  if (!logId) {
    const { data: latest } = await supabase
      .from("archivo_digital_sync_log")
      .select("id, status, resume_categoria_index, resume_employee_index, resume_subfolder_index, resume_files_url")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest && latest.status === "running") {
      logId = latest.id;
      categoriaIndex = latest.resume_categoria_index ?? 0;
      employeeIndex = latest.resume_employee_index ?? 0;
      subfolderIndex = latest.resume_subfolder_index ?? 0;
      filesUrl = latest.resume_files_url;
    } else {
      const { data: logRow, error: insertError } = await supabase
        .from("archivo_digital_sync_log")
        .insert({ status: "running", triggered_by: "manual", last_progress_at: new Date().toISOString() })
        .select("id").single();
      if (insertError) {
        return new Response(JSON.stringify({ success: true, skipped: "already_running" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      logId = logRow!.id;
    }
  }

  const counts = { archivosNuevos: 0, carpetasProcesadas: 0, sinEmpleadoMatch: 0 };

  async function respond(opts: {
    isFinished: boolean; nextCategoriaIndex: number; nextEmployeeIndex: number;
    nextSubfolderIndex: number; nextFilesUrl: string | null;
  }): Promise<Response> {
    const { isFinished, nextCategoriaIndex, nextEmployeeIndex, nextSubfolderIndex, nextFilesUrl } = opts;

    if (isFinished) {
      await supabase.from("archivo_digital_sync_log").update({
        status: "success", finished_at: new Date().toISOString(), last_progress_at: new Date().toISOString(),
        archivos_nuevos: counts.archivosNuevos, carpetas_procesadas: counts.carpetasProcesadas,
        sin_empleado_match: counts.sinEmpleadoMatch,
      }).eq("id", logId);
    } else {
      await supabase.from("archivo_digital_sync_log").update({
        resume_categoria_index: nextCategoriaIndex, resume_employee_index: nextEmployeeIndex,
        resume_subfolder_index: nextSubfolderIndex, resume_files_url: nextFilesUrl,
        last_progress_at: new Date().toISOString(),
        archivos_nuevos: counts.archivosNuevos, carpetas_procesadas: counts.carpetasProcesadas,
        sin_empleado_match: counts.sinEmpleadoMatch,
      }).eq("id", logId);

      const authHeader = req.headers.get("Authorization") || `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`;
      const triggerNext = fetch(`${supabaseUrl}/functions/v1/sync-archivo-digital`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader, "x-trigger": "chain" },
        body: JSON.stringify({
          categoriaIndex: nextCategoriaIndex, employeeIndex: nextEmployeeIndex,
          subfolderIndex: nextSubfolderIndex, filesUrl: nextFilesUrl, logId,
        }),
      }).catch((err) => console.error("[sync-archivo-digital] Auto-trigger failed:", err));

      // @ts-ignore EdgeRuntime es un global de Supabase/Deno Deploy, no esta en los tipos estandar
      if (typeof EdgeRuntime !== "undefined") {
        // @ts-ignore
        EdgeRuntime.waitUntil(triggerNext);
      } else {
        await triggerNext;
      }
    }

    return new Response(JSON.stringify({
      success: true, counts, isFinished, logId,
      nextCategoriaIndex, nextEmployeeIndex, nextSubfolderIndex, nextFilesUrl,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const token = await getMsToken();

    const { data: empleadosRows } = await supabase.from("empleados").select("id, nombreCompleto");
    const empleadoIdByNombre = new Map<string, number>();
    (empleadosRows || []).forEach((e: any) => {
      const norm = eliminarAcentos(e.nombreCompleto || "");
      if (norm && !empleadoIdByNombre.has(norm)) empleadoIdByNombre.set(norm, e.id);
    });

    const cat = CATEGORIAS[categoriaIndex];
    if (!cat) {
      return await respond({
        isFinished: true, nextCategoriaIndex: categoriaIndex, nextEmployeeIndex: 0,
        nextSubfolderIndex: 0, nextFilesUrl: null,
      });
    }

    const employeesUrl = `https://graph.microsoft.com/v1.0/users/${UPN}/drive/root:/${encodeURIComponent(`ARCHIVO DIGITAL/${cat.driveFolder}`)}:/children?$top=200&$select=id,name,folder`;
    const employees = (await graphGetAll(token, employeesUrl)).filter((it: any) => it.folder);

    let processedInThisCall = 0;

    for (let ei = employeeIndex; ei < employees.length; ei++) {
      const empFolder = employees[ei];
      const carpetaOrigen: string = empFolder.name;
      const empleadoId = empleadoIdByNombre.get(eliminarAcentos(carpetaOrigen)) ?? null;
      if (empleadoId == null) counts.sinEmpleadoMatch++;

      for (let si = (ei === employeeIndex ? subfolderIndex : 0); si < SUBCARPETAS.length; si++) {
        const sub = SUBCARPETAS[si];
        let nextUrl: string | null =
          (ei === employeeIndex && si === subfolderIndex && filesUrl)
            ? filesUrl
            : `https://graph.microsoft.com/v1.0/users/${UPN}/drive/root:/${encodeURIComponent(`ARCHIVO DIGITAL/${cat.driveFolder}/${carpetaOrigen}/Documentos/${sub}`)}:/children?$top=100&$select=id,name,size,file`;

        try {
          while (nextUrl) {
            const page = await graphGet(token, nextUrl);
            const files = (page.value || []).filter((f: any) => f.file);
            nextUrl = page["@odata.nextLink"] || null;

            if (files.length > 0) {
              const ids = files.map((f: any) => f.id);
              const { data: existing } = await supabase
                .from("archivo_digital_documentos")
                .select("onedrive_item_id")
                .in("onedrive_item_id", ids);
              const existingIds = new Set((existing || []).map((r: any) => r.onedrive_item_id));

              for (const f of files) {
                if (existingIds.has(f.id)) continue;

                // El listado no trae la downloadUrl con $select recortado; se pide
                // el item completo para obtener "@microsoft.graph.downloadUrl".
                let downloadUrl: string | undefined;
                try {
                  const full = await graphGet(token, `https://graph.microsoft.com/v1.0/users/${UPN}/drive/items/${f.id}`);
                  downloadUrl = full["@microsoft.graph.downloadUrl"];
                } catch (_) { continue; }
                if (!downloadUrl) continue;

                const fileRes = await fetch(downloadUrl);
                if (!fileRes.ok) continue;
                const bytes = new Uint8Array(await fileRes.arrayBuffer());

                const storagePath = `${cat.categoria.toLowerCase()}/${carpetaOrigen.replace(/\s+/g, "_")}/Documentos/${sub}/${Date.now()}_${sanitizeFilename(f.name)}`;

                const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, { upsert: false });
                if (uploadError) continue;

                await supabase.from("archivo_digital_documentos").insert({
                  categoria: cat.categoria, carpeta_origen: carpetaOrigen, empleado_id: empleadoId,
                  nombre_archivo: f.name, storage_path: storagePath, tamano_bytes: f.size ?? null,
                  onedrive_item_id: f.id, migrado_at: new Date().toISOString(),
                });
                counts.archivosNuevos++;
              }
            }

            // Corta y retoma esta misma subcarpeta si tiene mas de una pagina
            // (>100 archivos) para no acumular demasiado trabajo en una invocacion.
            if (nextUrl) {
              return await respond({
                isFinished: false, nextCategoriaIndex: categoriaIndex, nextEmployeeIndex: ei,
                nextSubfolderIndex: si, nextFilesUrl: nextUrl,
              });
            }
          }
        } catch (_) {
          // Carpeta sin ese subfolder (o error puntual de Graph) — se sigue con la siguiente.
        }
      }

      counts.carpetasProcesadas++;
      processedInThisCall++;

      if (processedInThisCall >= BATCH_EMPLEADOS && ei + 1 < employees.length) {
        return await respond({
          isFinished: false, nextCategoriaIndex: categoriaIndex, nextEmployeeIndex: ei + 1,
          nextSubfolderIndex: 0, nextFilesUrl: null,
        });
      }
    }

    const nextCategoriaIndex = categoriaIndex + 1;
    const isFinished = nextCategoriaIndex >= CATEGORIAS.length;
    return await respond({
      isFinished, nextCategoriaIndex, nextEmployeeIndex: 0, nextSubfolderIndex: 0, nextFilesUrl: null,
    });

  } catch (error: any) {
    if (logId) {
      await supabase.from("archivo_digital_sync_log").update({
        status: "error", finished_at: new Date().toISOString(), error_message: error.message,
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
