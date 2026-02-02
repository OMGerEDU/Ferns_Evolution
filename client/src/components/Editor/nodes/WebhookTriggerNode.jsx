import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Globe, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function WebhookTriggerNode({ id, data }) {
    const [copied, setCopied] = React.useState(false);

    // The ID of the node isn't the automation ID, 
    // but the FlowEditor usually has access to the automation context.
    // However, since we are in the Node component, we'll display a placeholder
    // or use a prop if passed via data.
    const automationId = data.automationId || '{automation_id}';
    const baseUrl = window.location.origin.replace('3000', '3001'); // Hack for dev, would be production URL
    const triggerUrl = `${baseUrl}/api/wh/trigger/${automationId}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(triggerUrl);
        setCopied(true);
        toast.success('Trigger URL copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-card border-2 border-emerald-500 rounded-lg p-4 shadow-lg min-w-[280px]">
            <div className="flex items-center gap-2 mb-3 border-b pb-2">
                <Globe size={16} className="text-emerald-500" />
                <span className="font-bold text-sm text-emerald-500 uppercase">External Webhook Trigger</span>
            </div>

            <div className="space-y-3">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Send a <b>POST</b> request to this URL to start the flow.
                    Must include a <b>"to"</b> field in the JSON body.
                </p>

                <div className="flex items-center gap-2 bg-muted p-2 rounded border border-border">
                    <code className="text-[10px] truncate flex-1">{triggerUrl}</code>
                    <button onClick={copyToClipboard} className="text-muted-foreground hover:text-primary transition">
                        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                </div>

                <div className="bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                    <label className="text-[9px] font-bold text-emerald-700 uppercase block mb-1">Example Payload</label>
                    <pre className="text-[9px] text-emerald-600 font-mono">
                        {`{
  "to": "5511999999999",
  "name": "Customer Name"
}`}
                    </pre>
                </div>
            </div>

            <div className="mt-4 flex flex-col items-end">
                <span className="text-[10px] text-emerald-500 font-bold uppercase">Start Flow</span>
                <Handle
                    type="source"
                    position={Position.Right}
                    id="output"
                    className="w-3 h-3 bg-emerald-500"
                />
            </div>
        </div>
    );
}
