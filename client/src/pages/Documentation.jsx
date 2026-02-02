import React from 'react';

export default function Documentation() {
    // The backend serves docs at /docs
    // Since we are proxied, we can use the relative path /api/docs or just /docs depending on how it's served.
    // In index.js: app.use('/docs', express.static('public/docs'));
    // Vite proxy: /api -> :3000. So we might need /api/docs/index.html or the proxy might catch /docs if configured.
    // Wait, vite.config.js only proxies /api and /wh.
    // I should probably add /docs to the proxy or use /api/docs if I move it.

    return (
        <div className="h-[calc(100vh-8rem)] w-full bg-white border border-border overflow-hidden">
            <iframe
                src="/docs/"
                className="w-full h-full border-none"
                title="API Documentation"
            />
        </div>
    );
}
