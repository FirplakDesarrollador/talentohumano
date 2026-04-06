/**
 * Dataverse Integration Library
 * This file handles OAuth 2.0 authentication and OData requests to Microsoft Dataverse (Dynamics 365).
 * 
 * REQUIRED ENV VARIABLES (.env.local):
 * - DATAVERSE_TENANT_ID: Azure Directory (tenant) ID
 * - DATAVERSE_CLIENT_ID: Registered Application (client) ID
 * - DATAVERSE_CLIENT_SECRET: Application secret
 * - DATAVERSE_RESOURCE_URL: The URL of your environment (e.g., https://myorg.crm.dynamics.com)
 */

export interface TokenResponse {
    token_type: string;
    expires_in: number;
    ext_expires_in: number;
    access_token: string;
}

/**
 * Gets a fresh access token using the Client Credentials flow.
 * Note: This should ONLY be called from the server (Server Components, Actions, or API Routes).
 */
export async function getAccessToken(): Promise<string> {
    const tenantId = process.env.DATAVERSE_TENANT_ID;
    const clientId = process.env.DATAVERSE_CLIENT_ID;
    const clientSecret = process.env.DATAVERSE_CLIENT_SECRET;
    const resource = process.env.DATAVERSE_RESOURCE_URL;

    if (!tenantId || !clientId || !clientSecret || !resource) {
        throw new Error('Dataverse environment variables are missing. Please check .env.local');
    }

    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: `${resource.endsWith('/') ? resource : resource + '/'}.default`
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
        next: { revalidate: 3500 } // Cache token for almost 1 hour
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Auth Error: ${error.error_description || response.statusText}`);
    }

    const data: TokenResponse = await response.json();
    return data.access_token;
}

/**
 * Executes a Dataverse OData query.
 * @param path The OData path (e.g., '/accounts?$select=name')
 * @param method HTTP Method (GET, POST, PATCH, DELETE)
 * @param body Optional JSON body for mutations
 */
export async function queryDataverse(path: string, method: string = 'GET', body: any = null) {
    const resource = process.env.DATAVERSE_RESOURCE_URL;
    const token = await getAccessToken();

    const url = `${resource}/api/data/v9.2${path.startsWith('/') ? path : '/' + path}`;
    
    const options: RequestInit = {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json; charset=utf-8',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
            'Prefer': 'return=representation'
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
        let errorMsg = response.statusText;
        try {
            const err = await response.json();
            errorMsg = err.error?.message || errorMsg;
        } catch (e) {}
        throw new Error(`Dataverse API Error (${response.status}): ${errorMsg}`);
    }

    if (response.status === 204) return null; // No content

    return response.json();
}
