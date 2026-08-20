/** @type {import('next').NextConfig} */
const nextConfig = {
    outputFileTracingIncludes: {
        '/api/decision-contrato': ['./templates/contratos/**'],
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'jdtjtkncptwqdhlxmzds.supabase.co',
            },
            {
                protocol: 'https',
                hostname: 'firplaksa.sharepoint.com',
            },
        ],
    },
};

export default nextConfig;
