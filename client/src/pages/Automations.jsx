import React, { useState, useRef, useEffect } from 'react';
import FlowEditor from '../components/Editor/FlowEditor';
import { initialNodes, initialEdges, compileFlowToRule } from '../lib/flowUtils';
import api from '../lib/api';
import { toast } from 'sonner';
import { Save, Bot, MessageSquare, GitBranch, Sparkles, MousePointer2, Globe, Clock, AlertTriangle, ToggleLeft, ToggleRight, Trash2, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import { ReactFlowProvider } from '@xyflow/react';

// Sidebar node configuration
const nodeCategories = [
    {
        title: 'Triggers',
        description: 'Entry points for your flow',
        nodes: [
            { type: 'trigger', label: 'Message Trigger', icon: Bot, color: 'text-primary', description: 'Fires when a message is received' },
            { type: 'webhook_trigger', label: 'External Webhook', icon: Globe, color: 'text-emerald-500', description: 'Triggered by external systems' },
        ]
    },
    {
        title: 'Logic',
        description: 'Control flow and decisions',
        nodes: [
            { type: 'condition', label: 'Condition', icon: GitBranch, color: 'text-orange-500', description: 'Branch based on conditions' },
            { type: 'ai_response', label: 'AI Response', icon: Sparkles, color: 'text-purple-500', description: 'Generate AI-powered replies' },
        ]
    },
    {
        title: 'Actions',
        description: 'Send messages and interact',
        nodes: [
            { type: 'action', label: 'Send Message', icon: MessageSquare, color: 'text-muted-foreground', description: 'Send a text message' },
            { type: 'interactive_message', label: 'Buttons / List', icon: MousePointer2, color: 'text-blue-500', description: 'Interactive button messages' },
        ]
    },
    {
        title: 'Timing',
        description: 'Control execution timing',
        nodes: [
            { type: 'delay', label: 'Delay', icon: Clock, color: 'text-amber-500', description: 'Pause before next action' },
        ]
    }
];

// Validate flow before saving
function validateFlow(nodes, edges) {
    const errors = [];

    const hasTrigger = nodes.some(n => n.type === 'trigger' || n.type === 'webhook_trigger');
    if (!hasTrigger) {
        errors.push('No trigger node found. Add a Trigger or Webhook to start your flow.');
    }

    const connectedNodeIds = new Set();
    edges.forEach(e => {
        connectedNodeIds.add(e.source);
        connectedNodeIds.add(e.target);
    });

    const orphanNodes = nodes.filter(n => !connectedNodeIds.has(n.id) && nodes.length > 1);
    if (orphanNodes.length > 0) {
        errors.push(`${orphanNodes.length} node(s) are not connected to the flow.`);
    }

    return errors;
}

export default function Automations() {
    const [ruleName, setRuleName] = useState('New Rule');
    const [editingId, setEditingId] = useState(null);
    const [savedRules, setSavedRules] = useState([]);
    const [showSavedRules, setShowSavedRules] = useState(true);
    const [tenantId, setTenantId] = useState(null);
    const editorRef = useRef(null);

    // Fetch saved rules on load & check for edit mode
    useEffect(() => {
        const fetchRules = async () => {
            try {
                // Check query params for edit mode
                const params = new URLSearchParams(window.location.search);
                const editId = params.get('edit');

                const tenantRes = await api.get('/tenants/default');
                const tid = tenantRes.data.id;
                setTenantId(tid);

                const res = await api.get(`/automations?tenantId=${tid}`);
                if (res.data.success) {
                    const rules = res.data.data || [];
                    setSavedRules(rules);

                    // If editID is present, try to load it
                    if (editId) {
                        const ruleToEdit = rules.find(r => r.id === editId);
                        if (ruleToEdit) {
                            setRuleName(ruleToEdit.name);
                            setEditingId(ruleToEdit.id);

                            // Load flow into editor
                            if (ruleToEdit.actions?.nodes && ruleToEdit.actions?.edges && editorRef.current) {
                                editorRef.current.setGraph(ruleToEdit.actions.nodes, ruleToEdit.actions.edges);
                            }

                            toast.info(`Editing: ${ruleToEdit.name}`);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to fetch rules:', err);
            }
        };
        fetchRules();
    }, []);

    const handleEdit = (rule) => {
        setRuleName(rule.name);
        setEditingId(rule.id);

        // Load into editor
        if (rule.actions?.nodes && rule.actions?.edges && editorRef.current) {
            editorRef.current.setGraph(rule.actions.nodes, rule.actions.edges);
        }

        toast.info(`Editing: ${rule.name}`);
    };

    const handleSave = async () => {
        try {
            const { nodes, edges } = editorRef.current.getSnapshot();

            const errors = validateFlow(nodes, edges);
            if (errors.length > 0) {
                errors.forEach(err => toast.warning(err, { icon: <AlertTriangle size={16} /> }));
                return;
            }

            const rule = compileFlowToRule(ruleName, nodes, edges);

            if (editingId) {
                await api.put(`/automations/${editingId}`, rule);
                toast.success('Automation Updated!');
                setEditingId(null);
            } else {
                await api.post('/automations/create', { ...rule, tenantId });
                toast.success('Automation Saved!');
            }

            // Refresh list
            const res = await api.get(`/automations?tenantId=${tenantId}`);
            if (res.data.success) setSavedRules(res.data.data || []);

            setRuleName('New Rule');
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to save');
        }
    };

    const handleToggle = async (id) => {
        try {
            await api.patch(`/automations/${id}/toggle`);
            const res = await api.get(`/automations?tenantId=${tenantId}`);
            if (res.data.success) setSavedRules(res.data.data || []);
            toast.success('Toggled!');
        } catch (err) {
            toast.error('Toggle failed');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this automation?')) return;
        try {
            await api.delete(`/automations/${id}`);
            setSavedRules(savedRules.filter(r => r.id !== id));
            toast.success('Deleted');
        } catch (err) {
            toast.error('Delete failed');
        }
    };



    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col">
            <div className="mb-4 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Automation Editor</h2>
                    <p className="text-muted-foreground text-sm">
                        {editingId ? `Editing: ${ruleName}` : 'Drag nodes to build your workflow'}
                    </p>
                </div>
                <div className="flex gap-4 items-center">
                    <input
                        className="bg-background border border-border rounded px-3 py-1.5 text-sm w-64"
                        value={ruleName}
                        onChange={e => setRuleName(e.target.value)}
                        placeholder="Rule Name"
                    />
                    <button onClick={handleSave} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">
                        <Save size={16} /> {editingId ? 'Update' : 'Save'} Rule
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-4 overflow-hidden">
                {/* Sidebar */}
                <div className="w-56 flex flex-col gap-4 overflow-y-auto pr-2">
                    {nodeCategories.map((category) => (
                        <div key={category.title} className="space-y-2">
                            <div>
                                <div className="text-xs font-semibold uppercase text-foreground">{category.title}</div>
                                <div className="text-[10px] text-muted-foreground">{category.description}</div>
                            </div>
                            {category.nodes.map((node) => (
                                <div
                                    key={node.type}
                                    className="bg-card border border-border p-3 rounded cursor-move hover:border-primary transition flex items-center gap-3 select-none group"
                                    onDragStart={(event) => event.dataTransfer.setData('application/reactflow', node.type)}
                                    draggable
                                    title={node.description}
                                >
                                    <node.icon size={18} className={node.color} />
                                    <span className="text-sm font-medium">{node.label}</span>
                                </div>
                            ))}
                        </div>
                    ))}

                    {/* Saved Rules Panel */}
                    <div className="border-t border-border pt-4 mt-2">
                        <button
                            onClick={() => setShowSavedRules(!showSavedRules)}
                            className="w-full flex justify-between items-center text-xs font-semibold uppercase text-foreground"
                        >
                            Saved Rules ({savedRules.length})
                            {showSavedRules ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {showSavedRules && (
                            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                                {savedRules.length === 0 ? (
                                    <p className="text-[10px] text-muted-foreground">No saved rules yet.</p>
                                ) : (
                                    savedRules.map(rule => (
                                        <div key={rule.id} className="bg-muted/30 p-2 rounded border border-border text-xs">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium truncate flex-1">{rule.name}</span>
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleToggle(rule.id)} title="Toggle">
                                                        {rule.enabled ? <ToggleRight size={14} className="text-green-500" /> : <ToggleLeft size={14} className="text-muted-foreground" />}
                                                    </button>
                                                    <button onClick={() => handleEdit(rule)} title="Edit"><Edit size={14} className="text-blue-500" /></button>
                                                    <button onClick={() => handleDelete(rule.id)} title="Delete"><Trash2 size={14} className="text-destructive" /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mt-auto p-3 bg-muted/20 rounded text-xs text-muted-foreground">
                        <p>💡 Tip: Connect nodes by dragging from one handle to another.</p>
                    </div>
                </div>

                {/* Editor */}
                <div className="flex-1 h-full shadow-inner rounded-lg">
                    <ReactFlowProvider>
                        <FlowEditor
                            ref={editorRef}
                            initialNodes={initialNodes}
                            initialEdges={initialEdges}
                        />
                    </ReactFlowProvider>
                </div>
            </div>
        </div>
    );
}
