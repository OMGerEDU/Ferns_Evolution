import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Sparkles, BrainCircuit } from 'lucide-react';

export default function AINode({ data }) {
    const onChange = (evt) => {
        data[evt.target.name] = evt.target.value;
    };

    return (
        <div className="bg-card border-2 border-purple-500 rounded-lg p-4 shadow-lg min-w-[260px]">
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-secondary" />

            <div className="flex items-center gap-2 mb-3 border-b pb-2">
                <Sparkles size={16} className="text-purple-500" />
                <span className="font-bold text-sm">AI Response (OpenAI/Claude)</span>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">System Instructions</label>
                    <textarea
                        name="systemPrompt"
                        placeholder="You are a helpful assistant..."
                        onChange={onChange}
                        defaultValue={data.systemPrompt || ''}
                        className="w-full text-xs bg-muted border border-border rounded px-2 py-1 h-16 resize-none"
                    />
                </div>

                <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">User Message / Choice</label>
                    <textarea
                        name="userPrompt"
                        placeholder="Analyze: {{content.text}}"
                        onChange={onChange}
                        defaultValue={data.userPrompt || '{{content.text}}'}
                        className="w-full text-xs bg-muted border border-border rounded px-2 py-1 h-12 resize-none"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Provider</label>
                        <select
                            name="provider"
                            onChange={onChange}
                            defaultValue={data.provider || 'openai'}
                            className="w-full text-xs bg-muted border border-border rounded px-2 py-1"
                        >
                            <option value="openai">OpenAI</option>
                            <option value="claude">Claude</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Model</label>
                        <input
                            name="model"
                            placeholder="gpt-4o..."
                            onChange={onChange}
                            defaultValue={data.model || ''}
                            className="w-full text-xs bg-muted border border-border rounded px-2 py-1"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">API Key (Optional)</label>
                    <input
                        name="apiKey"
                        type="password"
                        placeholder="If not in environment..."
                        onChange={onChange}
                        defaultValue={data.apiKey || ''}
                        className="w-full text-xs bg-muted border border-border rounded px-2 py-1"
                    />
                </div>
            </div>

            <div className="mt-4 flex flex-col items-end">
                <span className="text-[10px] text-purple-500 font-bold uppercase">Success</span>
                <Handle
                    type="source"
                    position={Position.Right}
                    id="success"
                    className="w-3 h-3 bg-purple-500"
                />
            </div>
        </div>
    );
}
