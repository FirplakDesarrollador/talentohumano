/** @type {import('next').NextConfig} */
const nextConfig = {
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
