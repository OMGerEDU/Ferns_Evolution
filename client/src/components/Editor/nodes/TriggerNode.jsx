import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Filter, MessageSquare, Globe, Users, Lock, Image as ImageIcon } from 'lucide-react';
import { cn } from "@/lib/utils";

export default memo(({ data, isConnectable }) => {
    // data contains: { provider, message_type, source, text_contains, onChange }
    const handleChange = (field, value) => {
        data.onChange && data.onChange(field, value);
    };

    return (
        <div className="bg-card border border-primary/50 shadow-lg shadow-primary/5 rounded-lg w-72 backdrop-blur-md">
            {/* Header */}
            <div className="bg-primary/10 p-3 rounded-t-lg border-b border-primary/20 flex items-center gap-2">
                <div className="bg-primary/20 p-1.5 rounded-md text-primary">
                    <Filter size={16} />
                </div>
                <div className="font-semibold text-sm">Trigger When...</div>
            </div>

            {/* Body */}
            <div className="p-3 space-y-3">



                <div className="flex gap-2">
                    {/* Message Type */}
                    <div className="space-y-1 flex-1">
                        <label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Type</label>
                        <select
                            className="w-full text-xs bg-background border border-border rounded p-1.5 focus:border-primary outline-none"
                            value={data.message_type || 'any'}
                            onChange={(e) => handleChange('message_type', e.target.value)}
                        >
                            <option value="any">Any</option>
                            <option value="text">Text</option>
                            <option value="image">Image</option>
                            <option value="audio">Audio</option>
                        </select>
                    </div>

                    {/* Source */}
                    <div className="space-y-1 flex-1">
                        <label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Source</label>
                        <select
                            className="w-full text-xs bg-background border border-border rounded p-1.5 focus:border-primary outline-none"
                            value={data.source || 'any'}
                            onChange={(e) => handleChange('source', e.target.value)}
                        >
                            <option value="any">Any</option>
                            <option value="private">Private</option>
                            <option value="group">Group</option>
                        </select>
                    </div>
                </div>

                {/* Text Filter */}
                <div className="space-y-1">
                    <label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Keywords</label>
                    <input
                        type="text"
                        className="w-full text-xs bg-background border border-border rounded p-1.5 focus:border-primary outline-none"
                        placeholder="Contains text..."
                        value={data.text_contains || ''}
                        onChange={(e) => handleChange('text_contains', e.target.value)}
                    />
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                isConnectable={isConnectable}
                className="w-3 h-3 bg-primary border-2 border-background"
            />
        </div>
    );
});
