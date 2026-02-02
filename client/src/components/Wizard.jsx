import React, { useState } from 'react';
import { Loader2, CheckCircle2, QrCode } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

export default function Wizard({ open, onOpenChange, onSuccess }) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ name: '', provider: 'evolution' });
    const [loading, setLoading] = useState(false);
    const [qrCode, setQrCode] = useState(null);

    const handleSubmitConfig = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (formData.provider === 'greenapi') {
                // Green API logic
                setStep(3); // Direct success/info step
            } else {
                // Evolution logic
                const res = await api.post('/instances', {
                    instanceName: formData.name,
                    token: '', // default
                    qrcode: true
                });

                // Evolution API v2 returns instance data directly or nested
                if (res && (res.qrcode || res.base64)) {
                    setQrCode(res.qrcode?.base64 || res.base64);
                    setStep(2);
                } else if (res.instance?.status === 'open') {
                    toast.success('Instance already connected');
                    onSuccess();
                    onOpenChange(false);
                }
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to create instance');
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-md p-6 rounded-xl border border-border shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Add Instance</h2>
                    <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">✕</button>
                </div>

                {step === 1 && (
                    <form onSubmit={handleSubmitConfig} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Provider</label>
                            <select
                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                value={formData.provider}
                                onChange={e => setFormData({ ...formData, provider: e.target.value })}
                            >
                                <option value="evolution">Evolution API (WhatsApp)</option>
                                <option value="greenapi">Green API (WhatsApp)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Instance Name / ID</label>
                            <input
                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder={formData.provider === 'greenapi' ? "idInstance" : "e.g. My Bot"}
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <button disabled={loading} className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 flex justify-center items-center gap-2 font-medium transition-colors">
                            {loading && <Loader2 className="animate-spin" size={18} />}
                            Continue
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <div className="text-center space-y-4">
                        <p className="text-muted-foreground">Scan QR Code to connect</p>
                        {qrCode ? (
                            <img src={qrCode} alt="QR Code" className="mx-auto rounded-lg border-4 border-white w-64 h-64 object-contain bg-white" />
                        ) : (
                            <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                                <Loader2 className="animate-spin text-muted-foreground" size={40} />
                            </div>
                        )}
                        <button onClick={() => { onOpenChange(false); onSuccess(); }} className="mt-4 text-sm text-primary hover:underline">
                            Done
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="text-center space-y-6 py-4">
                        <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 size={32} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Green API Configured</h3>
                            {/* Simplified for MVP */}
                        </div>
                        <button onClick={() => { onOpenChange(false); onSuccess(); }} className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium">
                            Finish
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
