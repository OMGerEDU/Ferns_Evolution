import React from 'react';
import { Smartphone, RefreshCw, Trash2, Unplug, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '../lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function InstanceCard({ instance, refetch, onConnect }) {
    const navigate = useNavigate();
    const isConnected = instance.status === 'open';

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${instance.name}?`)) return;
        try {
            await api.delete(`/instances/${instance.name}`);
            toast.success('Instance deleted');
            refetch();
        } catch (err) {
            toast.error('Failed to delete instance');
        }
    };

    const handleLogout = async () => {
        try {
            await api.delete(`/instances/${instance.name}/logout`);
            toast.success('Logged out');
            refetch();
        } catch (err) {
            toast.error('Failed to logout');
        }
    };

    return (
        <div
            onClick={() => navigate(`/instances/${instance.name}`)}
            className="bg-card border border-border rounded-lg p-5 flex items-center justify-between cursor-pointer hover:border-primary/50 transition relative"
        >
            <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-full", isConnected ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
                    <Smartphone size={24} />
                </div>
                <div>
                    <h3 className="font-semibold text-lg">{instance.profileName || instance.name}</h3>
                    {instance.profileName && (
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{instance.name}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded uppercase", isConnected ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
                            {instance.status || 'DISCONNECTED'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {instance.provider || 'evolution'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={() => navigate('/automations')}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition"
                    title="Automations"
                >
                    <Zap size={18} />
                </button>
                {isConnected ? (
                    <button onClick={handleLogout} className="px-3 py-1.5 text-sm font-medium border border-border rounded-md hover:bg-muted transition">
                        Logout
                    </button>
                ) : (
                    <button onClick={onConnect} className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition">
                        Connect
                    </button>
                )}
                <button onClick={handleDelete} className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition" title="Delete">
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
}
