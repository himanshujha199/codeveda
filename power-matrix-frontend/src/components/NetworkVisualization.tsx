import { useEffect, useState } from "react";

interface NetworkNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  size: number;
}

const NetworkVisualization = () => {
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    // Initialize network nodes
    const initialNodes: NetworkNode[] = [
      { id: "center", label: "", x: 250, y: 250, color: "primary", size: 20 },
      { id: "solar", label: "Solar Farm Network", x: 150, y: 120, color: "network-node", size: 8 },
      { id: "carbon", label: "Carbon Credit Zones", x: 380, y: 280, color: "network-zone", size: 8 },
      { id: "investors", label: "Active Investors", x: 320, y: 400, color: "network-connection", size: 8 },
      { id: "grid1", label: "", x: 100, y: 300, color: "network-node", size: 4 },
      { id: "grid2", label: "", x: 400, y: 150, color: "network-connection", size: 4 },
      { id: "grid3", label: "", x: 180, y: 380, color: "network-zone", size: 4 },
      { id: "grid4", label: "", x: 350, y: 100, color: "network-node", size: 4 },
    ];
    setNodes(initialNodes);

    // Animation loop
    const interval = setInterval(() => {
      setAnimationStep(prev => (prev + 1) % 360);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const getNodeStyle = (node: NetworkNode, index: number) => {
    const pulse = Math.sin((animationStep + index * 30) * 0.05) * 0.3 + 1;
    return {
      left: `${node.x}px`,
      top: `${node.y}px`,
      transform: `translate(-50%, -50%) scale(${pulse})`,
      width: `${node.size}px`,
      height: `${node.size}px`,
    };
  };

  const renderConnections = () => {
    const connections = [
      { from: nodes[0], to: nodes[1] },
      { from: nodes[0], to: nodes[2] },
      { from: nodes[0], to: nodes[3] },
      { from: nodes[1], to: nodes[4] },
      { from: nodes[2], to: nodes[5] },
      { from: nodes[3], to: nodes[6] },
      { from: nodes[0], to: nodes[7] },
    ];

    return connections.map((conn, index) => {
      if (!conn.from || !conn.to) return null;
      
      const length = Math.sqrt(
        Math.pow(conn.to.x - conn.from.x, 2) + Math.pow(conn.to.y - conn.from.y, 2)
      );
      const angle = Math.atan2(conn.to.y - conn.from.y, conn.to.x - conn.from.x) * 180 / Math.PI;
      
      const opacity = Math.sin((animationStep + index * 60) * 0.03) * 0.3 + 0.4;
      
      return (
        <div
          key={index}
          className="absolute h-0.5 bg-gradient-to-r from-primary/20 via-primary/60 to-primary/20"
          style={{
            left: `${conn.from.x}px`,
            top: `${conn.from.y}px`,
            width: `${length}px`,
            transform: `rotate(${angle}deg)`,
            transformOrigin: '0 50%',
            opacity,
          }}
        />
      );
    });
  };

  return (
    <div className="relative w-[500px] h-[500px] mx-auto">
      {/* Background circle */}
      <div className="absolute inset-0 rounded-full border border-primary/20 bg-gradient-secondary backdrop-blur-sm" />
      
      {/* Inner circle */}
      <div className="absolute inset-16 rounded-full border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent" />
      
      {/* Network connections */}
      {renderConnections()}
      
      {/* Network nodes */}
      {nodes.map((node, index) => (
        <div key={node.id} className="absolute">
          <div
            className={`rounded-full ${
              node.id === "center"
                ? "bg-gradient-primary shadow-glow"
                : `bg-${node.color} shadow-sm`
            } transition-all duration-300`}
            style={getNodeStyle(node, index)}
          />
          {node.label && (
            <div
              className="absolute whitespace-nowrap text-xs text-foreground/80 font-medium pointer-events-none"
              style={{
                left: `${node.x}px`,
                top: `${node.y + 20}px`,
                transform: "translateX(-50%)",
              }}
            >
              <div className="bg-background/80 backdrop-blur-sm rounded px-2 py-1 border border-border/50">
                • {node.label}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default NetworkVisualization;