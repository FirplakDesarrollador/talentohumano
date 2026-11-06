// Plan y bucket de Planner donde vive la tarea base "tarea base de consecución
// de personal administrativo" (FPK Talento Humano). Cada solicitud/vacante de
// personal crea una copia de esa tarea en el mismo plan/bucket.
const PLANNER_PLAN_ID = 'AiN77O9q2UCUGcf92cCCemQAFwoo';
const PLANNER_BUCKET_ID = 'jK0bUuOqL0umjvx_wgQ6bmQAME3I';
const PLANNER_BASE_TASK_ID = 'A-rb0xxzfkiy2V2ZSiX-EGQAOUgu';

const PLANNER_PRIORITY_IMPORTANTE = 3;
const PLANNER_PERCENT_EN_CURSO = 50;

export async function getMsToken(): Promise<string> {
    const tenantId = process.env.MICROSOFT_TENANT_ID!;
    const clientId = process.env.MICROSOFT_CLIENT_ID!;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;

    const tokenParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
    });

    const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Error autenticando con Microsoft: ' + JSON.stringify(data));
    return data.access_token;
}

async function resolveUserId(token: string, email: string): Promise<string | null> {
    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}?$select=id`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id || null;
}

export async function crearTareaPlanner(token: string, titulo: string, asignadosEmails: string[]) {
    // 1. Checklist de la tarea base (siempre se lee en vivo, por si cambia)
    const baseDetailsRes = await fetch(`https://graph.microsoft.com/v1.0/planner/tasks/${PLANNER_BASE_TASK_ID}/details`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!baseDetailsRes.ok) throw new Error('No se pudo leer la tarea base de Planner');
    const baseDetails = await baseDetailsRes.json();
    const checklistTitles: string[] = Object.values(baseDetails.checklist || {}).map((item: any) => item.title);

    // 2. Resolver los usuarios de Microsoft 365 a asignar
    const assignments: Record<string, any> = {};
    for (const email of asignadosEmails) {
        const userId = await resolveUserId(token, email);
        if (userId) {
            assignments[userId] = { '@odata.type': '#microsoft.graph.plannerAssignment', orderHint: ' !' };
        }
    }

    // 3. Crear la tarea en el mismo plan/bucket que la tarea base
    const createRes = await fetch('https://graph.microsoft.com/v1.0/planner/tasks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            planId: PLANNER_PLAN_ID,
            bucketId: PLANNER_BUCKET_ID,
            title: titulo,
            priority: PLANNER_PRIORITY_IMPORTANTE,
            percentComplete: PLANNER_PERCENT_EN_CURSO,
            assignments,
        }),
    });
    if (!createRes.ok) throw new Error('No se pudo crear la tarea en Planner: ' + await createRes.text());
    const created = await createRes.json();

    // 4. Copiar el checklist a la tarea nueva (necesita el etag de sus details)
    if (checklistTitles.length > 0) {
        const detailsGetRes = await fetch(`https://graph.microsoft.com/v1.0/planner/tasks/${created.id}/details`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const etag = detailsGetRes.headers.get('etag');

        const checklist: Record<string, any> = {};
        checklistTitles.forEach((title, idx) => {
            checklist[`item${idx}`] = { '@odata.type': '#microsoft.graph.plannerChecklistItem', title, orderHint: ' !' };
        });

        await fetch(`https://graph.microsoft.com/v1.0/planner/tasks/${created.id}/details`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'If-Match': etag || '',
            },
            body: JSON.stringify({ checklist }),
        });
    }

    const taskUrl = `https://planner.cloud.microsoft/webui/v1/plan/${PLANNER_PLAN_ID}/view/board/task/${created.id}?tid=${process.env.MICROSOFT_TENANT_ID}`;
    return { taskId: created.id as string, taskUrl };
}
