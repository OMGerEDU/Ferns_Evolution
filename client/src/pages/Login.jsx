import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
    const [apiKey, setApiKey] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        if (!apiKey.trim()) {
            toast.error('Please enter an API Key');
            return;
        }
        localStorage.setItem('evolution_api_key', apiKey.trim());
        toast.success('Authenticated');
        navigate('/');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-primary/10 p-4 rounded-full mb-4">
                        <KeyRound className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Evolution Admin</h1>
                    <p className="text-gray-500 text-sm mt-2">Enter your Global API Key to continue</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                            Global API Key
                        </label>
                        <input
                            id="apiKey"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                            placeholder="Ex: 54yWPufPt9y2Wp9..."
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition shadow-sm"
                    >
                        Connect
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-gray-400">
                    Connecting to:
                    <br />
                    <code className="bg-gray-100 px-1 py-0.5 rounded mt-1 inline-block">
                        {import.meta.env.VITE_API_URL || 'Production'}
                    </code>
                </div>
            </div>
        </div>
    );
}
