import { createClient } from 'jsr:@supabase/supabase-js@2'

// Excel "ListadoVacaciones.xlsx" en SharePoint (sitio TalentoHumano), compartido por link.
const SHARE_URL = 'https://firplaksa.sharepoint.com/:x:/s/TalentoHumano/IQAqzatmAs7XQZmwZ8PrGburAdWF9yDUReoY4KDQHJRbLqg?e=AFzt8h'

// Rango fijo en vez de usedRange(): si alguien aplica formato a una fila/columna
// entera en el Excel, usedRange() puede crecer hasta el limite de Graph
// (RangeExceedsLimit) aunque los datos reales ocupen pocas filas.
const RANGE_ADDRESS = 'A1:D10000'

// Codifica una URL de sharing de SharePoint/OneDrive al formato "shareId" que
// acepta el endpoint /shares/{shareId} de Microsoft Graph.
function encodeShareUrl(url: string): string {
    const base64 = btoa(url)
    const base64url = base64.replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-')
    return 'u!' + base64url
}

async function getMsToken(tenantId: string, clientId: string, clientSecret: string): Promise<string> {
    const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
    })
    const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
    })
    const data = await res.json()
    if (!res.ok) throw new Error('Error autenticando con Microsoft Graph: ' + JSON.stringify(data))
    return data.access_token
}

Deno.serve(async (req: Request) => {
    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, serviceRoleKey)

        // 0. Esta funcion no requiere JWT de Supabase (verify_jwt=false) porque la invoca
        // pg_cron sin sesion de usuario. En su lugar, valida un secreto propio y dedicado
        // guardado en una tabla protegida (nunca el service_role key completo).
        const cronSecret = req.headers.get('x-cron-secret')
        const { data: secretRow, error: secretError } = await supabase
            .from('edge_function_secrets')
            .select('value')
            .eq('name', 'sync_personal_con_jefe_cron')
            .single()
        if (secretError || !secretRow || !cronSecret || cronSecret !== secretRow.value) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // 1. Credenciales de Microsoft Graph (guardadas en tabla protegida, no en secrets)
        const { data: creds, error: credsError } = await supabase
            .from('ms_graph_app_credentials')
            .select('tenant_id, client_id, client_secret')
            .eq('id', 'default')
            .single()
        if (credsError || !creds) throw new Error('No se encontraron las credenciales de Microsoft Graph')

        const token = await getMsToken(creds.tenant_id, creds.client_id, creds.client_secret)
        const headers = { Authorization: `Bearer ${token}` }

        // 2. Resolver el archivo compartido a driveId/itemId
        const shareId = encodeShareUrl(SHARE_URL)
        const shareRes = await fetch(`https://graph.microsoft.com/v1.0/shares/${shareId}/driveItem`, { headers })
        const shareData = await shareRes.json()
        if (!shareRes.ok) throw new Error('Error resolviendo el archivo de SharePoint: ' + JSON.stringify(shareData))

        const driveId = shareData.parentReference.driveId
        const itemId = shareData.id

        // 3. Leer un rango fijo de la primera hoja (via Workbook API, sin descargar el binario)
        const wsRes = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/workbook/worksheets`, { headers })
        const wsData = await wsRes.json()
        if (!wsRes.ok || !wsData.value || wsData.value.length === 0) throw new Error('No se encontraron hojas en el libro de Excel')
        const sheetName = wsData.value[0].name

        const rangeRes = await fetch(
            `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/workbook/worksheets('${encodeURIComponent(sheetName)}')/range(address='${RANGE_ADDRESS}')?$select=values`,
            { headers }
        )
        const rangeData = await rangeRes.json()
        if (!rangeRes.ok) throw new Error('Error leyendo el rango del Excel: ' + JSON.stringify(rangeData))

        // 4. Mapear filas: Columna1=Cedula, Columna2=Nombre_Completo, Columna3=codigo (no se usa), Columna4=Dias_Pendientes
        const rows: unknown[][] = rangeData.values || []
        const dataRows = rows.slice(1) // saltar encabezado

        const registros = dataRows
            .filter((r) => r[0] !== null && r[0] !== '' && r[1] !== null && r[1] !== '')
            .map((r) => ({
                Cedula: Math.trunc(Number(r[0])),
                Nombre_Completo: String(r[1]).trim(),
                Dias_Pendientes: r[3] !== null && r[3] !== '' ? Number(r[3]) : null,
            }))

        if (registros.length === 0) {
            throw new Error('El Excel no tiene filas validas, se aborta para no vaciar la tabla')
        }

        // 5. Reemplazo completo: la tabla representa un snapshot mensual, no un historico
        const { error: deleteError } = await supabase.from('PersonalConJefe').delete().gte('id', 0)
        if (deleteError) throw new Error('Error borrando datos anteriores: ' + deleteError.message)

        const { error: insertError } = await supabase.from('PersonalConJefe').insert(registros)
        if (insertError) throw new Error('Error insertando datos nuevos: ' + insertError.message)

        return new Response(JSON.stringify({ success: true, registrosActualizados: registros.length }), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (err) {
        console.error('Error en sync-personal-con-jefe:', err)
        return new Response(
            JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
})
