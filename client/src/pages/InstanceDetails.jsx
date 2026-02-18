import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { ArrowLeft, Smartphone, Zap, Plus, Settings, MessageSquare, AlertTriangle, History, Clock, CheckCircle2, XCircle, QrCode, Loader2 } from 'lucide-react';
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
    const { data: automations, isLoading: loadingAutomations, refetch: refetchAutomations } = useQuery({
        queryKey: ['automations', instanceName],
        queryFn: async () => {
            const res = await api.get(`/automations?tenantId=${instanceName}`);
            console.log('[AUTOMATIONS DEBUG] Response:', res);
            console.log('[AUTOMATIONS DEBUG] Data array:', res.data);
            return res.data || [];
        }
    });

    // Fetch Built-in Automations Templates
    const { data: builtinTemplates, isLoading: loadingBuiltin } = useQuery({
        queryKey: ['builtin-automations'],
        queryFn: async () => {
            const res = await api.get('/automations/builtin');
            console.log('[BUILTIN DEBUG] Response:', res);
            return res.data || [];
        }
    });

    // Fetch Automation Logs
    const { data: automationLogs, isLoading: loadingLogs } = useQuery({
        queryKey: ['automation-logs', instanceName],
        queryFn: async () => {
            const res = await api.get(`/automations/logs/${instanceName}?limit=50`);
            return res.data || [];
        },
        refetchInterval: 5000 // Auto-refresh every 5 seconds
    });

    const isConnected = instance?.instance?.state === 'open' || instance?.state === 'open';

    // Webhook Config State
    const [showWebhookConfig, setShowWebhookConfig] = useState(false);
    const [savingWebhook, setSavingWebhook] = useState(false);
    const [showRescan, setShowRescan] = useState(false);
    const [rescanLoading, setRescanLoading] = useState(false);
    const [rescanQr, setRescanQr] = useState(null);

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

    // --- Instance Settings Logic ---
    const [savingSettings, setSavingSettings] = useState(false);

    // Fetch Settings
    const { data: settings, isLoading: loadingSettings, refetch: refetchSettings } = useQuery({
        queryKey: ['settings', instanceName],
        queryFn: async () => {
            const res = await api.get(`/instances/${instanceName}/settings`);
            // Structure is typically { success: true, data: { ... } } or nested
            // Evolution returns { settings: { rejectCall: ... } } inside 'data' sometimes?
            // Let's inspect format based on script output.
            // Script said: Data: { settings: { instanceName: ..., settings: { rejectCall: ... } } }
            // So res.data might be that object.
            // We need to return the inner 'settings' object.
            const raw = res.data;
            // Check deep structure
            if (raw?.settings?.settings) return raw.settings.settings;
            if (raw?.settings) return raw.settings;
            return raw || {};
        },
        enabled: isConnected // Only fetch if connected/created
    });

    const handleUpdateSettings = async (key, value) => {
        try {
            setSavingSettings(true);
            // Optimistic update (optional, but UI feels faster)
            // For now, simple wait.

            // Construct payload. Evolution usually accepts just the changed key or full object.
            // Recommendation: Send full object with merged change to be safe, 
            // or just the change if API supports partial. 
            // The script sent a full object. Let's send a merged object.
            const newSettings = {
                ...settings,
                [key]: value
            };

            await api.post(`/instances/${instanceName}/settings`, newSettings);
            toast.success('Settings updated');
            refetchSettings();
        } catch (err) {
            toast.error('Failed to update settings');
            console.error(err);
        } finally {
            setSavingSettings(false);
        }
    };

    const toggleList = (list, item) => {
        if (list.includes(item)) return list.filter(i => i !== item);
        return [...list, item];
    };

    const handleRescanQr = async () => {
        try {
            setShowRescan(true);
            setRescanLoading(true);
            setRescanQr(null);
            const res = await api.post(`/instances/${instanceName}/rescan-qr`);
            const qr = res?.data?.qrcode?.base64 || res?.data?.base64 || res?.qrcode?.base64 || res?.base64;
            if (qr) {
                setRescanQr(qr);
            } else {
                toast.error('QR not available for this instance');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to rescan QR');
        } finally {
            setRescanLoading(false);
        }
    };

    // Built-in Automations State
    const [builtinConfigs, setBuiltinConfigs] = useState({});
    const [savingBuiltin, setSavingBuiltin] = useState(null);
    const [expandedBuiltin, setExpandedBuiltin] = useState({});
    const [customExpanded, setCustomExpanded] = useState(false);

    // Check if a built-in automation is enabled
    const isBuiltinEnabled = (templateId) => {
        const result = automations?.some(a => a.builtin_template_id === templateId && a.enabled);
        console.log(`[BUILTIN CHECK] ${templateId}:`, result, 'automations:', automations);
        return result;
    };

    // Get config for enabled built-in automation
    const getBuiltinConfig = (templateId) => {
        const automation = automations?.find(a => a.builtin_template_id === templateId);
        return automation?.config || {};
    };

    // Handle toggling built-in automation
    const handleToggleBuiltin = async (template, enabled, overrideConfig = null) => {
        try {
            setSavingBuiltin(template.id);
            const config = overrideConfig || builtinConfigs[template.id] || getBuiltinConfig(template.id) || {};

            if (enabled) {
                await api.post(`/automations/builtin/${template.id}/enable`, {
                    tenantId: instanceName,
                    config,
                    enabled: true
                });
                toast.success(`${template.name} enabled`);
            } else {
                await api.delete(`/automations/builtin/${template.id}/disable?tenantId=${instanceName}`);
                toast.success(`${template.name} disabled`);
            }

            // Refetch automations to update the list
            refetchAutomations();
        } catch (error) {
            toast.error('Failed to update automation');
            console.error(error);
        } finally {
            setSavingBuiltin(null);
        }
    };

    // Update config for a built-in automation
    const updateBuiltinConfig = (templateId, key, value) => {
        setBuiltinConfigs(prev => ({
            ...prev,
            [templateId]: {
                ...(prev[templateId] || getBuiltinConfig(templateId) || {}),
                [key]: value
            }
        }));
    };

    const toggleBuiltinExpand = (templateId) => {
        setExpandedBuiltin(prev => ({
            ...prev,
            [templateId]: !prev[templateId]
        }));
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
        <div className="max-w-7xl mx-auto p-6 space-y-8">
            {showRescan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-md p-6 rounded-xl border border-border shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold">Rescan QR</h2>
                            <button onClick={() => setShowRescan(false)} className="text-muted-foreground hover:text-foreground">✕</button>
                        </div>

                        <div className="text-center space-y-4">
                            <p className="text-muted-foreground">Scan QR Code to reconnect</p>
                            {rescanQr ? (
                                <img src={rescanQr} alt="QR Code" className="mx-auto rounded-lg border-4 border-white w-64 h-64 object-contain bg-white" />
                            ) : (
                                <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                                    <Loader2 className="animate-spin text-muted-foreground" size={40} />
                                </div>
                            )}
                            <div className="flex justify-center gap-2 pt-2">
                                <Button variant="outline" onClick={() => setShowRescan(false)}>Close</Button>
                                <Button onClick={handleRescanQr} disabled={rescanLoading}>
                                    {rescanLoading ? 'Rescanning...' : 'Rescan'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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
                        <Button variant="outline" onClick={handleRescanQr}>
                            <QrCode className="mr-2 h-4 w-4" /> Rescan QR
                        </Button>
                        {!isConnected && (
                            <Button onClick={() => navigate('/')}>Connect Now</Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4 w-full">
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
                                    let owner = instance?.instance?.owner;

                                    if (!owner) owner = instance?.owner || instance?.number;

                                    if (owner) {
                                        const phone = owner.split('@')[0];
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

                {/* Custom Automations Section */}
                <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4 w-full">
                    <div className="flex justify-between items-center">
                        <button
                            type="button"
                            onClick={() => setCustomExpanded((v) => !v)}
                            className="text-left flex items-center gap-2"
                            aria-expanded={customExpanded}
                            aria-controls="custom-automations-panel"
                        >
                            <Zap className="h-5 w-5 text-blue-500" />
                            <span className="font-semibold text-lg">Custom Automations</span>
                        </button>
                        <Button size="sm" onClick={() => navigate('/automations')}>
                            <Plus className="mr-2 h-4 w-4" /> New Rule
                        </Button>
                    </div>
                    <Separator />

                    {customExpanded && (
                        <div id="custom-automations-panel">
                            {loadingAutomations ? (
                                <div className="text-center py-6 text-muted-foreground">Loading rules...</div>
                            ) : automations?.filter(a => !a.is_builtin).length === 0 ? (
                                <div className="text-center py-8 border border-dashed rounded-lg">
                                    <p className="text-muted-foreground mb-2">No custom automations found.</p>
                                    <Button variant="link" onClick={() => navigate('/automations')}>Create your first rule</Button>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {automations?.filter(a => !a.is_builtin).map(rule => (
                                        <div
                                            key={rule.id}
                                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition cursor-pointer"
                                            onClick={() => navigate(`/automations?edit=${rule.id}`)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "p-2 rounded-md",
                                                    rule.enabled ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
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
                    )}
                </div>

                {/* Instance Behavior Settings */}
                <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4 w-full">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-lg flex items-center">
                            <Settings className="mr-2 h-5 w-5 text-purple-500" />
                            Behavior Settings
                        </h3>
                        {savingSettings && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                    <Separator />

                    {loadingSettings ? (
                        <div className="text-center py-4 text-muted-foreground">Loading settings...</div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <label className="text-sm font-medium">Always Online</label>
                                    <p className="text-xs text-muted-foreground">Show as "Online"</p>
                                </div>
                                <Switch
                                    checked={settings?.alwaysOnline || false}
                                    onCheckedChange={(c) => handleUpdateSettings('alwaysOnline', c)}
                                    disabled={savingSettings}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <label className="text-sm font-medium">Read Messages</label>
                                    <p className="text-xs text-muted-foreground">Send Blue Ticks</p>
                                </div>
                                <Switch
                                    checked={settings?.readMessages || false}
                                    onCheckedChange={(c) => handleUpdateSettings('readMessages', c)}
                                    disabled={savingSettings}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <label className="text-sm font-medium">Reject Calls</label>
                                    <p className="text-xs text-muted-foreground">Auto-decline calls</p>
                                </div>
                                <Switch
                                    checked={settings?.rejectCall || false}
                                    onCheckedChange={(c) => handleUpdateSettings('rejectCall', c)}
                                    disabled={savingSettings}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <label className="text-sm font-medium">Ignore Groups</label>
                                    <p className="text-xs text-muted-foreground">Don't listen to groups</p>
                                </div>
                                <Switch
                                    checked={settings?.groupsIgnore || false}
                                    onCheckedChange={(c) => handleUpdateSettings('groupsIgnore', c)}
                                    disabled={savingSettings}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <label className="text-sm font-medium">Sync History</label>
                                    <p className="text-xs text-muted-foreground">Sync historical chats</p>
                                </div>
                                <Switch
                                    checked={settings?.syncFullHistory || false}
                                    onCheckedChange={(c) => handleUpdateSettings('syncFullHistory', c)}
                                    disabled={savingSettings}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Built-in Automations Card */}
                <div className="bg-card border rounded-xl p-6 shadow-sm w-full space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-lg flex items-center">
                            <Zap className="mr-2 h-5 w-5 text-yellow-500" />
                            Built-in Automations
                        </h3>
                        <Badge variant="outline" className="text-xs">Quick Start</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Pre-made automations ready to use</p>
                    <Separator />

                    {loadingBuiltin ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : builtinTemplates?.length === 0 ? (
                        <div className="text-center py-10 border border-dashed rounded-lg">
                            <p className="text-muted-foreground">No built-in automations available.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {builtinTemplates?.map(template => {
                                const enabled = isBuiltinEnabled(template.id);
                                const config = builtinConfigs[template.id] || getBuiltinConfig(template.id) || {};
                                const isSaving = savingBuiltin === template.id;
                                const isExpanded = !!expandedBuiltin[template.id];

                                return (
                                    <div
                                        key={template.id}
                                        className={cn(
                                            "p-4 rounded-lg border transition-all",
                                            enabled ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" : "bg-muted/20"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="pt-1">
                                                <Checkbox
                                                    id={`builtin-${template.id}`}
                                                    checked={enabled}
                                                    onCheckedChange={(checked) => handleToggleBuiltin(template, checked)}
                                                    disabled={isSaving}
                                                />
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleBuiltinExpand(template.id)}
                                                        className="text-left cursor-pointer flex items-center gap-2"
                                                        aria-expanded={isExpanded}
                                                        aria-controls={`builtin-panel-${template.id}`}
                                                    >
                                                        <span className="text-xl">{template.icon}</span>
                                                        <div>
                                                            <div className="font-medium">{template.name}</div>
                                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                                {template.description}
                                                            </div>
                                                        </div>
                                                    </button>
                                                    <Badge
                                                        variant={enabled ? "default" : "secondary"}
                                                        className={cn(
                                                            "ml-2",
                                                            enabled && "bg-green-600 hover:bg-green-700 text-white"
                                                        )}
                                                    >
                                                        {isSaving ? 'Saving...' : enabled ? 'Active' : 'Available'}
                                                    </Badge>
                                                </div>

                                                {isExpanded && (
                                                    <div id={`builtin-panel-${template.id}`} className="space-y-4 pl-7">
                                                        {/* Outgoing Toggle */}
                                                        <div className="flex items-center space-x-2">
                                                            <Switch
                                                                id={`outgoing-${template.id}`}
                                                                checked={config.include_outgoing || false}
                                                                onCheckedChange={(checked) => {
                                                                    updateBuiltinConfig(template.id, 'include_outgoing', checked);
                                                                    if (enabled) {
                                                                        const currentConfig = builtinConfigs[template.id] || getBuiltinConfig(template.id) || {};
                                                                        const newConfig = { ...currentConfig, include_outgoing: checked };

                                                                        const timeoutId = setTimeout(() => {
                                                                            handleToggleBuiltin(template, true, newConfig);
                                                                        }, 500);
                                                                        return () => clearTimeout(timeoutId);
                                                                    }
                                                                }}
                                                                disabled={isSaving}
                                                                className="scale-75 origin-left"
                                                            />
                                                            <label
                                                                htmlFor={`outgoing-${template.id}`}
                                                                className="text-xs text-muted-foreground cursor-pointer select-none"
                                                            >
                                                                Include Outgoing Messages
                                                            </label>
                                                        </div>

                                                        {template.config_schema?.properties && Object.entries(template.config_schema.properties).map(([key, field]) => (
                                                            <div key={key} className="space-y-1">
                                                                <label className="text-xs font-medium text-muted-foreground">
                                                                    {field.label || key}
                                                                </label>
                                                                <Input
                                                                    placeholder={field.placeholder}
                                                                    value={config[key] ?? field.default ?? ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        updateBuiltinConfig(template.id, key, val);
                                                                        if (enabled && val) {
                                                                            const currentConfig = builtinConfigs[template.id] || getBuiltinConfig(template.id) || {};
                                                                            const newConfig = { ...currentConfig, [key]: val };

                                                                            const timeoutId = setTimeout(() => {
                                                                                handleToggleBuiltin(template, true, newConfig);
                                                                            }, 1000);
                                                                            return () => clearTimeout(timeoutId);
                                                                        }
                                                                    }}
                                                                    disabled={isSaving}
                                                                    className="h-8 text-sm"
                                                                />
                                                                {field.description && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {field.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {!template.config_schema?.properties && (
                                                            <p className="text-xs text-muted-foreground">No configuration required.</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Automation History */}
            <div className="mt-8 mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <History className="w-5 h-5 text-blue-600" />
                    <h2 className="text-xl font-semibold">Automation History</h2>
                    <Badge variant="outline" className="ml-2">
                        {automationLogs?.length || 0} recent
                    </Badge>
                </div>

                {loadingLogs ? (
                    <div className="text-center py-8 text-gray-500">Loading history...</div>
                ) : automationLogs?.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No automation activity yet</p>
                    </div>
                ) : (
                    <div className="bg-card rounded-lg border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Time</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Automation</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">From</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase w-1/4">Message</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Action</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {automationLogs?.map((log, idx) => (
                                        <tr key={log.id || idx} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(log.created_at).toLocaleString('en-GB', {
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium">
                                                {log.automation_name}
                                                <div className="text-xs text-muted-foreground">{log.trigger_type}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">
                                                {log.message_from?.replace('@s.whatsapp.net', '') || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">
                                                <div className="truncate max-w-xs" title={log.message_text}>
                                                    {log.message_text || '—'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <Badge variant="secondary" className="text-xs">
                                                    {log.action_taken || 'N/A'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {log.status === 'success' ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                                        Success
                                                    </Badge>
                                                ) : log.status === 'error' ? (
                                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" title={log.error_message}>
                                                        <XCircle className="w-3 h-3 mr-1" />
                                                        Error
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">{log.status}</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
