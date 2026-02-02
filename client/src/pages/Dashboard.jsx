import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import InstanceCard from '../components/InstanceCard';
import Wizard from '../components/Wizard';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Dashboard() {
    const [wizardOpen, setWizardOpen] = useState(false);

    const { data: instanceList, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['instances'],
        queryFn: async () => {
            const res = await api.get('/instances');
            const rawInstances = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);

            // Parallel fetch status & profile for each instance
            const processed = await Promise.all(rawInstances.map(async (inst) => {
                const name = inst.name || inst.instance?.instanceName || inst.instanceName;
                if (!name) return null;

                let status = 'disconnected';
                let provider = 'evolution'; // Default
                let profileName = null;
                let profilePictureUrl = null;

                try {
                    const s = await api.get(`/instances/${name}`);
                    // Check complex nested state from Evolution
                    if (s.success && (s.data?.instance?.state === 'open' || s.data?.instance?.status === 'open')) {
                        status = 'open';

                        // Try to fetch profile name if connected
                        try {
                            if (s.data?.instance?.owner) {
                                const owner = s.data.instance.owner.split('@')[0];
                                const p = await api.post('/profile/fetch', { instanceName: name, number: owner });
                                if (p.data?.success && p.data?.data) {
                                    profileName = p.data.data.pushName || p.data.data.name; // Adjust based on actual API response
                                }
                            }
                        } catch (err) {
                            // Ignore profile fetch errors
                        }
                    }
                } catch (e) {
                    console.warn(`Failed to fetch status for ${name}`, e);
                }

                return {
                    name,
                    status,
                    provider,
                    profileName, // Pass profile name to component
                    original: inst
                };
            }));

            return processed.filter(Boolean).sort((a, b) => a.status === 'open' ? -1 : 1);
        }
    });

    const safeList = instanceList || [];

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
                    <p className="text-muted-foreground">Manage your connected WhatsApp instances.</p>
                </div>
                <button
                    onClick={() => setWizardOpen(true)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition shadow-sm font-medium"
                >
                    <Plus size={20} />
                    Add Instance
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard label="Total Instances" value={safeList.length} />
                <StatCard label="Connected" value={safeList.filter(i => i.status === 'open').length} className="text-green-500" />
                <StatCard label="Disconnected" value={safeList.filter(i => i.status !== 'open').length} className="text-red-500" />
            </div>

            {isError && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200">
                    <h3 className="font-bold">Error loading instances</h3>
                    <p>{error?.message || "Unknown error occurred"}</p>
                    <pre className="text-xs mt-2 opacity-75">{JSON.stringify(error?.response?.data || {}, null, 2)}</pre>
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-20 text-muted-foreground">Loading instances...</div>
            ) : (
                <div className="space-y-4">
                    {safeList.length === 0 ? (
                        <div className="text-center py-20 border border-dashed border-border rounded-lg">
                            <p className="text-muted-foreground">No instances found. Create one to get started.</p>
                        </div>
                    ) : (
                        safeList.map((inst, idx) => (
                            <InstanceCard
                                key={inst.name || idx}
                                instance={inst}
                                refetch={refetch}
                                onConnect={() => setWizardOpen(true)}
                            />
                        ))
                    )}
                </div>
            )}

            <Wizard open={wizardOpen} onOpenChange={setWizardOpen} onSuccess={refetch} />
        </div>
    );
}

function StatCard({ label, value, className }) {
    return (
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
            <div className={cn("text-3xl font-bold mb-1", className)}>{value}</div>
            <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">{label}</div>
        </div>
    )
}
