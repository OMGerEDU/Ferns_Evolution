import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { ArrowLeft, Smartphone, Zap, Plus, Settings, MessageSquare, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function InstanceDetails() {
    const { instanceName } = useParams();
    const navigate = useNavigate();

    // Fetch Instance Details
    const { data: instance, isLoading: loadingInstance } = useQuery({
        queryKey: ['instance', instanceName],
        queryFn: async () => {
            const res = await api.get(`/instances/${instanceName}`);
            // Also try to fetch profile info if connected
            let profile = null;
            if (res.data?.instance?.state === 'open') {
                try {
                    // We need the number to fetch profile. 
                    // Usually in res.data.instance.owner (JID)
                    const ownerJid = res.data.instance.owner;
                    if (ownerJid) {
                        const p = await api.post('/profile/fetch', {
                            instanceName,
                            number: ownerJid.split('@')[0]
                        });
                        profile = p.data;
                    }
                } catch (e) {
                    console.warn('Failed to fetch profile', e);
                }
            }
            return { ...res.data, profile };
        }
    });

    // Fetch Automations for this instance
    // We assume the instanceName corresponds to the tenantId for now, 
    // or we use 'default' if strictly single-tenant. 
    // Based on user request, we want automations FOR THIS instance.
    // If your backend segregates by tenantId, and instanceName != tenantId, 
    // we might need a mapping. For now, let's assume tenantId='default' 
    // BUT filter or maybe the user IS the tenant.
    // Let's stick to tenantId='default' for the list, 
    // but ideally we'd filter by instance if the backend supported it.
    // The requirement says "automations and clickable to move to that automation".
    // We'll fetch all validation rules for 'default' tenant for now.
    const { data: automations, isLoading: loadingAutomations } = useQuery({
        queryKey: ['automations', 'default'],
        queryFn: async () => {
            const res = await api.get('/automations?tenantId=default');
            return res.data.data || [];
        }
    });

    const isConnected = instance?.instance?.state === 'open' || instance?.state === 'open';

    // Webhook Config State
    const [showWebhookConfig, setShowWebhookConfig] = useState(false);
    const [savingWebhook, setSavingWebhook] = useState(false);

    // Fetch Webhook Config
    const { data: webhookConfig, refetch: refetchWebhook, isLoading } = useQuery({
        queryKey: ['webhook', instanceName],
        queryFn: async () => {
            const res = await api.get(`/webhook-config/${instanceName}`);
            // Note: api.js interceptor already unwraps response.data
            // So res is already {success: true, data: {...}}
            return res.data || null;
        },
        enabled: showWebhookConfig
    });

    // Form State - use query data if available, otherwise defaults
    const defaultConfig = React.useMemo(() => ({
        url: '',
        enabled: true,
        events: ['messages.upsert'],
        sources: ['groups', 'private'],
        allow_media: false,
        outgoing_url: '',
        track_outgoing: false
    }), []);

    const [localConfig, setLocalConfig] = useState(defaultConfig);

    // Update localConfig when webhookConfig loads from API
    React.useEffect(() => {
        if (webhookConfig && webhookConfig !== null) {
            console.log('[WEBHOOK EFFECT] Updating localConfig with API data:', webhookConfig);
            setLocalConfig(webhookConfig);
        }
    }, [webhookConfig]);

    const handleSaveWebhook = async () => {
        try {
            setSavingWebhook(true);
            await api.post(`/webhook-config/${instanceName}`, localConfig);
            toast.success('Webhook settings saved');
            setShowWebhookConfig(false);
            refetchWebhook();
        } catch (err) {
            toast.error('Failed to save settings');
            console.error(err);
        } finally {
            setSavingWebhook(false);
        }
    };

    const toggleList = (list, item) => {
        if (list.includes(item)) return list.filter(i => i !== item);
        return [...list, item];
    };

    console.log('[WEBHOOK CONFIG RENDER] localConfig:', localConfig);
    console.log('[WEBHOOK CONFIG RENDER] webhookConfig:', webhookConfig);

    if (showWebhookConfig) {
        return (
            <div className="max-w-2xl mx-auto p-6 space-y-6">
                <div>
                    <Button variant="ghost" onClick={() => setShowWebhookConfig(false)} className="pl-0 mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Instance
                    </Button>
                    <h1 className="text-2xl font-bold">Webhook Configuration</h1>
                    <p className="text-muted-foreground">Configure where to forward events for this instance.</p>
                </div>

                <div className="bg-card border rounded-xl p-6 space-y-6">

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium">Enable Webhook</label>
                            <p className="text-xs text-muted-foreground">Turn on/off forwarding</p>
                        </div>
                        <Switch
                            checked={localConfig.enabled}
                            onCheckedChange={c => setLocalConfig({ ...localConfig, enabled: c })}
                        />
                    </div>
                    <Separator />

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Target URL (Incoming Messages)</label>
                        <Input
                            placeholder="https://your-api.com/webhook"
                            value={localConfig.url || ''}
                            onChange={e => setLocalConfig({ ...localConfig, url: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium">Track Outgoing Messages</label>
                            <p className="text-xs text-muted-foreground">Forward messages sent by you/bot</p>
                        </div>
                        <Switch
                            checked={localConfig.track_outgoing}
                            onCheckedChange={c => setLocalConfig({ ...localConfig, track_outgoing: c })}
                        />
                    </div>

                    {localConfig.track_outgoing && (
                        <div className="space-y-2 pl-4 border-l-2 border-muted animate-in fade-in slide-in-from-left-2">
                            <label className="text-sm font-medium">Target URL (Outgoing Messages)</label>
                            <Input
                                placeholder="https://your-api.com/webhook/outgoing (Optional - uses default if empty)"
                                value={localConfig.outgoing_url || ''}
                                onChange={e => setLocalConfig({ ...localConfig, outgoing_url: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="text-sm font-medium">Events</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['messages.upsert', 'messages.update', 'qrcode-updated', 'connection-update'].map(evt => (
                                <div key={evt} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={evt}
                                        checked={localConfig.events?.includes(evt)}
                                        onCheckedChange={() => setLocalConfig({
                                            ...localConfig,
                                            events: toggleList(localConfig.events || [], evt)
                                        })}
                                    />
                                    <label htmlFor={evt} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {evt}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium">Sources (Messages Only)</label>
                        <div className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="private"
                                    checked={localConfig.sources?.includes('private')}
                                    onCheckedChange={() => setLocalConfig({
                                        ...localConfig,
                                        sources: toggleList(localConfig.sources || [], 'private')
                                    })}
                                />
                                <label htmlFor="private" className="text-sm">Private Chats</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="groups"
                                    checked={localConfig.sources?.includes('groups')}
                                    onCheckedChange={() => setLocalConfig({
                                        ...localConfig,
                                        sources: toggleList(localConfig.sources || [], 'groups')
                                    })}
                                />
                                <label htmlFor="groups" className="text-sm">Groups</label>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium">Allow Media</label>
                            <p className="text-xs text-muted-foreground">Forward messages containing media</p>
                        </div>
                        <Switch
                            checked={localConfig.allow_media}
                            onCheckedChange={c => setLocalConfig({ ...localConfig, allow_media: c })}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowWebhookConfig(false)}>Cancel</Button>
                        <Button onClick={handleSaveWebhook} disabled={savingWebhook}>
                            {savingWebhook ? 'Saving...' : 'Save Configuration'}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div>
                <Button
                    variant="ghost"
                    className="mb-4 pl-0 text-muted-foreground hover:text-foreground"
                    onClick={() => navigate('/')}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Button>

                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "p-4 rounded-full",
                            isConnected ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        )}>
                            <Smartphone className="h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                {instance?.profile?.status || instance?.instanceName || instanceName}
                            </h1>
                            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                                <span>ID: {instanceName}</span>
                                <Badge variant={isConnected ? "default" : "destructive"} className={cn("ml-2")}>
                                    {isConnected ? "CONNECTED" : "DISCONNECTED"}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowWebhookConfig(true)}>
                            <Settings className="mr-2 h-4 w-4" /> Webhook Settings
                        </Button>
                        {!isConnected && (
                            <Button onClick={() => navigate('/')}>Connect Now</Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Connection Details Card */}
                <div className="bg-card border rounded-xl p-6 shadow-sm md:col-span-1 space-y-4">
                    <h3 className="font-semibold text-lg flex items-center">
                        <Smartphone className="mr-2 h-5 w-5 text-primary" />
                        Connection Info
                    </h3>
                    <Separator />

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Status</span>
                            <span className="font-medium capitalize">
                                {instance?.instance?.state || instance?.state || 'Unknown'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Provider</span>
                            <span className="font-medium">Evolution API</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Phone</span>
                            <span className="font-medium">
                                {(() => {
                                    // 1. Try owner from nested instance object (connectionState)
                                    let owner = instance?.instance?.owner;

                                    // 2. Try owner/number from top level (fetchInstances merge)
                                    if (!owner) owner = instance?.owner || instance?.number;

                                    if (owner) {
                                        const phone = owner.split('@')[0];
                                        // Validate it's actually a number (digits only)
                                        if (/^\d+$/.test(phone)) return phone;
                                    }

                                    return 'Waiting for Connection...';
                                })()}
                            </span>
                        </div>
                        {instance?.profile && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Push Name</span>
                                <span className="font-medium">{instance.profile.pushName || 'N/A'}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Automations List */}
                <div className="bg-card border rounded-xl p-6 shadow-sm md:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-lg flex items-center">
                            <Zap className="mr-2 h-5 w-5 text-yellow-500" />
                            Automations
                        </h3>
                        <Button size="sm" onClick={() => navigate('/automations')}>
                            <Plus className="mr-2 h-4 w-4" /> New Rule
                        </Button>
                    </div>
                    <Separator />

                    {loadingAutomations ? (
                        <div className="text-center py-8 text-muted-foreground">Loading rules...</div>
                    ) : automations?.length === 0 ? (
                        <div className="text-center py-10 border border-dashed rounded-lg">
                            <p className="text-muted-foreground mb-2">No automations found.</p>
                            <Button variant="link" onClick={() => navigate('/automations')}>Create your first rule</Button>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {automations.map(rule => (
                                <div
                                    key={rule.id}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition cursor-pointer"
                                    onClick={() => navigate(`/automations?edit=${rule.id}`)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "p-2 rounded-md",
                                            rule.enabled ? "bg-yellow-100 text-yellow-600" : "bg-gray-100 text-gray-400"
                                        )}>
                                            <Zap className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="font-medium">{rule.name}</div>
                                            <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                                                Trigger: {rule.trigger?.type} • Actions: {rule.actions?.length || 0}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={rule.enabled ? "outline" : "secondary"}>
                                            {rule.enabled ? 'Active' : 'Disabled'}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
