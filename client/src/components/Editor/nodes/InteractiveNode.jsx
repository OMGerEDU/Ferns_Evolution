import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { MousePointer2, Plus, Trash2 } from 'lucide-react';

export default function InteractiveNode({ data }) {
    const [buttons, setButtons] = React.useState(data.buttons || [{ id: '1', text: 'Option 1' }]);

    const updateButtons = (newButtons) => {
        setButtons(newButtons);
        data.buttons = newButtons;
    };

    const addButton = () => {
        if (buttons.length >= 3) return; // WhatsApp limit
        updateButtons([...buttons, { id: Date.now().toString(), text: `Option ${buttons.length + 1}` }]);
    };

    const removeButton = (id) => {
        updateButtons(buttons.filter(b => b.id !== id));
    };

    const updateButtonText = (id, text) => {
        updateButtons(buttons.map(b => b.id === id ? { ...b, text } : b));
    };

    return (
        <div className="bg-card border-2 border-blue-500 rounded-lg p-4 shadow-lg min-w-[240px]">
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-secondary" />

            <div className="flex items-center gap-2 mb-3 border-b pb-2">
                <MousePointer2 size={16} className="text-blue-500" />
                <span className="font-bold text-sm">Interactive (Buttons)</span>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Title (Bold)</label>
                    <input
                        placeholder="Choose an option..."
                        onChange={(e) => data.title = e.target.value}
                        defaultValue={data.title || ''}
                        className="w-full text-xs bg-muted border border-border rounded px-2 py-1"
                    />
                </div>

                <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Description</label>
                    <textarea
                        placeholder="Please select one of the following:"
                        onChange={(e) => data.description = e.target.value}
                        defaultValue={data.description || ''}
                        className="w-full text-xs bg-muted border border-border rounded px-2 py-1 h-12 resize-none"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Buttons (Max 3)</label>
                        {buttons.length < 3 && (
                            <button onClick={addButton} className="text-blue-500 hover:text-blue-600">
                                <Plus size={14} />
                            </button>
                        )}
                    </div>

                    {buttons.map((btn) => (
                        <div key={btn.id} className="flex gap-2 items-center">
                            <input
                                value={btn.text}
                                onChange={(e) => updateButtonText(btn.id, e.target.value)}
                                className="flex-1 text-xs bg-muted border border-border rounded px-2 py-1"
                            />
                            <button onClick={() => removeButton(btn.id)} className="text-destructive opacity-50 hover:opacity-100">
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>

                <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Footer (Small)</label>
                    <input
                        placeholder="Evolution Sync"
                        onChange={(e) => data.footer = e.target.value}
                        defaultValue={data.footer || ''}
                        className="w-full text-xs bg-muted border border-border rounded px-2 py-1"
                    />
                </div>
            </div>

            <div className="mt-4 flex flex-col items-end">
                <span className="text-[10px] text-blue-500 font-bold uppercase">Sent</span>
                <Handle
                    type="source"
                    position={Position.Right}
                    id="sent"
                    className="w-3 h-3 bg-blue-500"
                />
            </div>
        </div>
    );
}
