import React, { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Send, Info } from 'lucide-react';

export default memo(({ data, isConnectable }) => {
    const [showHints, setShowHints] = useState(false);

    const handleChange = (field, value) => {
        data.onChange && data.onChange(field, value);
    };

    return (
        <div className="bg-card border border-border shadow-lg rounded-lg w-72 backdrop-blur-md">
            <Handle
                type="target"
                position={Position.Left}
                isConnectable={isConnectable}
                className="w-3 h-3 bg-muted-foreground border-2 border-background"
            />

            {/* Header */}
            <div className="bg-muted/30 p-3 rounded-t-lg border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-background p-1.5 rounded-md border border-border text-muted-foreground">
                        <Send size={16} />
                    </div>
                    <div className="font-semibold text-sm">Send Message</div>
                </div>
                <button
                    onClick={() => setShowHints(!showHints)}
                    className="text-muted-foreground hover:text-primary transition"
                    title="Show available variables"
                >
                    <Info size={14} />
                </button>
            </div>

            {/* Variable Hints */}
            {showHints && (
                <div className="bg-primary/5 p-2 border-b border-primary/20 text-[10px] space-y-1">
                    <div className="font-bold text-primary uppercase">Available Variables:</div>
                    <code className="block text-muted-foreground">{"{{content.text}}"} - Message text</code>
                    <code className="block text-muted-foreground">{"{{sender_name}}"} - Sender name</code>
                    <code className="block text-muted-foreground">{"{{from}}"} - Phone number</code>
                    <code className="block text-muted-foreground">{"{{ai_response}}"} - AI output</code>
                </div>
            )}

            {/* Body */}
            <div className="p-3 space-y-3">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Message Content</label>
                    <textarea
                        className="w-full text-xs bg-background border border-border rounded p-2 min-h-[80px] focus:border-primary outline-none resize-none"
                        placeholder="Hi {{sender_name}}! How can I help?"
                        value={data.text || ''}
                        onChange={(e) => handleChange('text', e.target.value)}
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Recipient</label>
                    <div className="flex gap-2">
                        <select
                            className="w-full text-xs bg-background border border-border rounded p-1.5 focus:border-primary outline-none"
                            value={data.recipientType || 'sender'}
                            onChange={(e) => handleChange('recipientType', e.target.value)}
                        >
                            <option value="sender">Reply to Sender</option>
                            <option value="custom">Custom Number</option>
                        </select>
                    </div>
                    {data.recipientType === 'custom' && (
                        <input
                            type="text"
                            className="w-full text-xs bg-background border border-border rounded p-1.5 focus:border-primary outline-none mt-1"
                            placeholder="e.g., 1234567890"
                            value={data.customNumber || ''}
                            onChange={(e) => handleChange('customNumber', e.target.value)}
                        />
                    )}
                </div>

                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                    <span>{data.recipientType === 'custom' ? 'Custom Recipient' : 'Replies to Sender'}</span>
                    <span>Text Message</span>
                </div>
            </div>

            {/* Output Handle for chaining */}
            <Handle
                type="source"
                position={Position.Right}
                isConnectable={isConnectable}
                className="w-3 h-3 bg-primary border-2 border-background"
            />
        </div>
    );
});
