import React, { useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import { toast } from 'sonner';
import { ReactFlow, Background, Controls, MiniMap, addEdge, useNodesState, useEdgesState, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TriggerNode from './nodes/TriggerNode';
import ActionNode from './nodes/ActionNode';
import ConditionNode from './nodes/ConditionNode';
import AINode from './nodes/AINode';
import InteractiveNode from './nodes/InteractiveNode';
import WebhookTriggerNode from './nodes/WebhookTriggerNode';
import DelayNode from './nodes/DelayNode';

const nodeTypes = {
    trigger: TriggerNode,
    action: ActionNode,
    condition: ConditionNode,
    ai_response: AINode,
    interactive_message: InteractiveNode,
    webhook_trigger: WebhookTriggerNode,
    delay: DelayNode
};

const FlowEditor = forwardRef(({ initialNodes, initialEdges }, ref) => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);

    // State for Edge Context Menu
    const [contextMenu, setContextMenu] = useState(null);

    useImperativeHandle(ref, () => ({
        getSnapshot: () => ({ nodes, edges }),
        setGraph: (newNodes, newEdges) => {
            setNodes(newNodes);
            setEdges(newEdges);
        }
    }));

    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
        [setEdges],
    );

    const onNodeDataChange = useCallback((id, field, value) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id !== id) return node;
                return {
                    ...node,
                    data: { ...node.data, [field]: value },
                };
            })
        );
    }, [setNodes]);

    const nodesWithHandlers = nodes.map(node => ({
        ...node,
        data: {
            ...node.data,
            onChange: (field, value) => onNodeDataChange(node.id, field, value)
        }
    }));

    const handleDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow');
            if (typeof type === 'undefined' || !type) return;

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode = {
                id: `${type}-${Date.now()}`,
                type,
                position,
                data: (() => {
                    switch (type) {
                        case 'condition':
                            return { field: 'content.text', operator: 'contains', value: '' };
                        case 'ai_response':
                            return { provider: 'openai', systemPrompt: 'You are a helpful assistant.', userPrompt: '{{content.text}}' };
                        case 'interactive_message':
                            return { title: 'Select Options', description: 'Please choose:', footer: '', buttons: [{ id: '1', text: 'Option 1' }] };
                        case 'webhook_trigger':
                            return { automationId: 'SAVE_TO_GET_ID' };
                        case 'delay':
                            return { seconds: 3 };
                        case 'trigger':
                            return { provider: 'any' };
                        default:
                            return { text: '' };
                    }
                })(),
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes],
    );

    // Delete Confirmation
    const onBeforeDelete = useCallback(async ({ nodes }) => {
        // If deleting edges only, allow immediately (handled by standard backspace which deletes selected)
        // Check if there are any nodes being deleted
        if (nodes.length === 0) return true;

        // Return a promise that resolves true/false based on user interaction
        return new Promise((resolve) => {
            // Using standard confirm for simplicity first, but user asked for "pop up agree toast"
            // Since we can't block with a custom UI inside this callback easily without a state-driven approach that pauses execution...
            // Actually, sonner toast promise is async.
            // Let's use a custom approach:

            // We'll mimic the "pop up agree toast" by using library toast with action
            toast('Delete this module?', {
                action: {
                    label: 'Yes, Delete',
                    onClick: () => resolve(true)
                },
                cancel: {
                    label: 'Cancel',
                    onClick: () => resolve(false)
                },
                onDismiss: () => resolve(false), // Dismissing = Cancel
                duration: Infinity, // Wait for user
            });
        });
    }, []);

    // Edge Context Menu
    const onEdgeContextMenu = useCallback(
        (event, edge) => {
            event.preventDefault();
            event.stopPropagation();

            setContextMenu({
                id: edge.id,
                top: event.clientY,
                left: event.clientX,
            });
        },
        [setContextMenu]
    );

    const onPaneClick = useCallback(() => setContextMenu(null), []);

    const handleUnlink = useCallback(() => {
        if (contextMenu) {
            setEdges((edges) => edges.filter((edge) => edge.id !== contextMenu.id));
            setContextMenu(null);
        }
    }, [contextMenu, setEdges]);


    return (
        <div className="h-full w-full bg-background border border-border rounded-lg overflow-hidden flex flex-col relative">
            {/* Context Menu */}
            {contextMenu && (
                <div
                    style={{ top: contextMenu.top, left: contextMenu.left }}
                    className="fixed z-50 bg-popover border border-border rounded shadow-md p-1 min-w-[120px] animate-in fade-in zoom-in-95 duration-100"
                >
                    <button
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 rounded flex items-center gap-2 text-destructive"
                        onClick={handleUnlink}
                    >
                        Unlink
                    </button>
                </div>
            )}

            <div className="flex-1">
                <ReactFlow
                    nodes={nodesWithHandlers}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    onInit={setReactFlowInstance}
                    onDrop={onDrop}
                    onDragOver={handleDragOver}
                    onBeforeDelete={onBeforeDelete}
                    onEdgeContextMenu={onEdgeContextMenu}
                    onPaneClick={onPaneClick}
                    fitView
                    className="bg-background/50"
                >
                    <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
                    <Controls className="bg-card border border-border text-foreground" />
                    <MiniMap className="bg-card border border-border" maskColor="rgba(0, 0, 0, 0.5)" />
                </ReactFlow>
            </div>
        </div>
    );
});

export default FlowEditor;
