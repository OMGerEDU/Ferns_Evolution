import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

export default function ConditionNode({ data }) {
    const onChange = (evt) => {
        // We'll use a callback or state management if needed, 
        // but for now React Flow nodes data can be updated via node properties
        data.field = evt.target.name === 'field' ? evt.target.value : data.field;
        data.operator = evt.target.name === 'operator' ? evt.target.value : data.operator;
        data.value = evt.target.name === 'value' ? evt.target.value : data.value;
    };

    return (
        <div className="bg-card border-2 border-orange-500 rounded-lg p-4 shadow-lg min-w-[200px]">
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-secondary" />

            <div className="flex items-center gap-2 mb-3 border-b pb-2">
                <GitBranch size={16} className="text-orange-500" />
                <span className="font-bold text-sm">Condition (IF)</span>
            </div>

            <div className="space-y-2">
                <select
                    name="field"
                    onChange={onChange}
                    defaultValue={data.field || 'content.text'}
                    className="w-full text-xs bg-muted border border-border rounded px-2 py-1"
                >
                    <option value="content.text">Message Text</option>
                    <option value="sender_name">Sender Name</option>
                    <option value="provider">Provider</option>
                </select>

                <select
                    name="operator"
                    onChange={onChange}
                    defaultValue={data.operator || 'contains'}
                    className="w-full text-xs bg-muted border border-border rounded px-2 py-1"
                >
                    <option value="contains">Contains</option>
                    <option value="equals">Equals</option>
                    <option value="starts_with">Starts With</option>
                </select>

                <input
                    name="value"
                    placeholder="Value..."
                    onChange={onChange}
                    defaultValue={data.value || ''}
                    className="w-full text-xs bg-muted border border-border rounded px-2 py-1"
                />
            </div>

            <div className="mt-4 flex justify-between relative pl-4 pr-4">
                <div className="flex flex-col items-start">
                    <span className="text-[10px] text-green-500 font-bold">TRUE</span>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="true"
                        style={{ top: 'auto', bottom: '15px', backgroundColor: '#22c55e' }}
                        className="w-3 h-3"
                    />
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-red-500 font-bold">FALSE</span>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="false"
                        style={{ top: 'auto', bottom: '0px', backgroundColor: '#ef4444' }}
                        className="w-3 h-3"
                    />
                </div>
            </div>
        </div>
    );
}
