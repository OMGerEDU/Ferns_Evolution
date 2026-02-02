export const initialNodes = [
    {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 250, y: 100 },
        data: { provider: 'any', message_type: 'any', source: 'any', text_contains: '' },
    },
    {
        id: 'action-1',
        type: 'action',
        position: { x: 650, y: 100 },
        data: { text: '' },
    },
];

export const initialEdges = [
    { id: 'e1-2', source: 'trigger-1', target: 'action-1', animated: true },
];

/**
 * Compiles React Flow nodes/edges into Backend Rule JSON
 */
export function compileFlowToRule(name, nodes, edges) {
    // 1. Find the Trigger Node
    const triggerNode = nodes.find(n => n.type === 'trigger');
    if (!triggerNode) throw new Error("No Trigger Node found");

    // 2. Build Trigger Object
    const trigger = {
        provider: triggerNode.data.provider || 'any',
        message_type: triggerNode.data.message_type || 'any',
        source: triggerNode.data.source || 'any',
        text_contains: triggerNode.data.text_contains || ''
    };

    // 3. Export the Graph for the Engine
    // Filters out trigger from execution nodes to avoid redundancy
    const actions = {
        nodes: nodes.map(n => ({
            id: n.id,
            type: n.type,
            data: n.data
        })),
        edges: edges.map(e => ({
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle
        }))
    };

    return {
        name,
        enabled: true,
        trigger,
        actions
    };
}
