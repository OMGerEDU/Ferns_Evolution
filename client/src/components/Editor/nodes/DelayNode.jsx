import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clock } from 'lucide-react';

export default function DelayNode({ data }) {
    const handleChange = (value) => {
        data.onChange && data.onChange('seconds', parseInt(value) || 0);
    };

    return (
        <div className="bg-card border-2 border-amber-500 rounded-lg p-4 shadow-lg min-w-[200px]">
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-secondary" />

            <div className="flex items-center gap-2 mb-3 border-b pb-2">
                <Clock size={16} className="text-amber-500" />
                <span className="font-bold text-sm">Wait / Delay</span>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground block">
                    Pause for
                </label>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min="0"
                        max="300"
                        placeholder="5"
                        defaultValue={data.seconds || 3}
                        onChange={(e) => handleChange(e.target.value)}
                        className="w-20 text-center text-sm bg-muted border border-border rounded px-2 py-1.5 font-mono"
                    />
                    <span className="text-xs text-muted-foreground">seconds</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                    Adds a delay before the next action executes.
                </p>
            </div>

            <div className="mt-4 flex flex-col items-end">
                <span className="text-[10px] text-amber-500 font-bold uppercase">Then</span>
                <Handle
                    type="source"
                    position={Position.Right}
                    id="output"
                    className="w-3 h-3 bg-amber-500"
                />
            </div>
        </div>
    );
}
