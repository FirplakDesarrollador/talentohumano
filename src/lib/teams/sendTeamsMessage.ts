import { createClient } from '@supabase/supabase-js';

const TOKEN_PURPOSE = 'teams_chat_analista';
const SENDER_UPN = 'analista.desarrollador@firplak.com';

function getSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, serviceRoleKey);
}

// El envio de mensajes de Teams via Graph app-only no esta disponible (Microsoft restringe
// ChatMessage.Send.All/.Chat a autorizacion especial y Teamwork.Migrate.All solo sirve para
// importar historial). Por eso se usa login delegado: un token de analista.desarrollador@firplak.com
// obtenido una vez via device code y renovado automaticamente con el refresh_token guardado.
async function getDelegatedAccessToken(): Promise<string> {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('ms_graph_tokens')
        .select('refresh_token')
        .eq('purpose', TOKEN_PURPOSE)
        .single();

    if (error || !data) {
        throw new Error('No hay token delegado de Teams guardado. Es necesario volver a iniciar sesion con analista.desarrollador@firplak.com.');
    }

    const params = new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        grant_type: 'refresh_token',
        refresh_token: data.refresh_token,
        scope: 'https://graph.microsoft.com/Chat.ReadWrite offline_access',
    });

    const res = await fetch(`https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
    });
    const tokenData = await res.json();
    if (!res.ok) {
        throw new Error('Error refrescando el token delegado de Teams (puede que haya expirado y haya que reautenticar): ' + JSON.stringify(tokenData));
    }

    await supabase
        .from('ms_graph_tokens')
        .update({
            refresh_token: tokenData.refresh_token,
            access_token: tokenData.access_token,
            expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('purpose', TOKEN_PURPOSE);

    return tokenData.access_token;
}

async function getOrCreateOneOnOneChat(token: string, toEmail: string): Promise<string> {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const chatBody = {
        chatType: 'oneOnOne',
        members: [
            {
                '@odata.type': '#microsoft.graph.aadUserConversationMember',
                roles: ['owner'],
                'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${SENDER_UPN}')`,
            },
            {
                '@odata.type': '#microsoft.graph.aadUserConversationMember',
                roles: ['owner'],
                'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${toEmail}')`,
            },
        ],
    };
    const res = await fetch('https://graph.microsoft.com/v1.0/chats', {
        method: 'POST',
        headers,
        body: JSON.stringify(chatBody),
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Error creando chat de Teams: ' + JSON.stringify(data));
    return data.id;
}

export async function sendTeamsMessage(toEmail: string, htmlContent: string): Promise<void> {
    const token = await getDelegatedAccessToken();
    const chatId = await getOrCreateOneOnOneChat(token, toEmail);

    const res = await fetch(`https://graph.microsoft.com/v1.0/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: { contentType: 'html', content: htmlContent } }),
    });
    if (!res.ok) {
        throw new Error('Error enviando mensaje de Teams: ' + JSON.stringify(await res.json()));
    }
}
