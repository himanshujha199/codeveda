import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";

// World locations for solar projects and connections
const locations = [
  { name: "Solar Farm Network", lat: 37.7749, lng: -122.4194, color: "#00D4AA" }, // San Francisco
  { name: "Carbon Credit Zones", lat: 51.5074, lng: -0.1278, color: "#4F46E5" }, // London
  { name: "Active Investors", lat: 35.6762, lng: 139.6503, color: "#F59E0B" }, // Tokyo
  { name: "Grid Network", lat: -33.8688, lng: 151.2093, color: "#00D4AA" }, // Sydney
  { name: "Investment Hub", lat: 40.7128, lng: -74.0060, color: "#4F46E5" }, // New York
  { name: "Energy Trading", lat: 55.7558, lng: 37.6173, color: "#F59E0B" }, // Moscow
  { name: "Solar Farms", lat: -23.5505, lng: -46.6333, color: "#00D4AA" }, // São Paulo
  { name: "Clean Energy", lat: 28.6139, lng: 77.2090, color: "#4F46E5" }, // Delhi
];

// Convert lat/lng to 3D coordinates on sphere
const latLngToVector3 = (lat: number, lng: number, radius: number = 2) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
};

const Globe = () => {
  const globeRef = useRef<THREE.Mesh>(null);
  const [time, setTime] = useState(0);

  useFrame((state) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.003;
    }
    setTime(state.clock.getElapsedTime());
  });

  // Create connection lines between locations
  const connections = [
    [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 0], [7, 1]
  ];

  return (
    <>
      {/* Main Globe */}
      <mesh ref={globeRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial
          color="#0f172a"
          transparent
          opacity={0.8}
          wireframe={false}
        />
      </mesh>

      {/* Globe wireframe overlay */}
      <mesh>
        <sphereGeometry args={[2.01, 32, 32]} />
        <meshBasicMaterial
          color="#00D4AA"
          transparent
          opacity={0.1}
          wireframe
        />
      </mesh>

      {/* Location markers */}
      {locations.map((location, index) => {
        const position = latLngToVector3(location.lat, location.lng);
        const pulse = Math.sin(time * 2 + index) * 0.3 + 1;
        
        return (
          <group key={index}>
            {/* Marker sphere */}
            <mesh position={position}>
              <sphereGeometry args={[0.03 * pulse, 8, 8]} />
              <meshBasicMaterial color={location.color} />
            </mesh>
            
            {/* Glowing effect */}
            <mesh position={position}>
              <sphereGeometry args={[0.06 * pulse, 8, 8]} />
              <meshBasicMaterial
                color={location.color}
                transparent
                opacity={0.3}
              />
            </mesh>

            {/* Label */}
            <Text
              position={[position.x * 1.2, position.y * 1.2, position.z * 1.2]}
              fontSize={0.1}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
            >
              • {location.name}
            </Text>
          </group>
        );
      })}

      {/* Connection lines */}
      {connections.map((connection, index) => {
        const startPos = latLngToVector3(locations[connection[0]].lat, locations[connection[0]].lng);
        const endPos = latLngToVector3(locations[connection[1]].lat, locations[connection[1]].lng);
        
        // Create curved connection line
        const curve = new THREE.QuadraticBezierCurve3(
          startPos,
          startPos.clone().add(endPos).multiplyScalar(0.7),
          endPos
        );
        
        const points = curve.getPoints(20);
        const opacity = Math.sin(time * 1.5 + index * 0.5) * 0.3 + 0.5;
        
        return (
          <Line
            key={index}
            points={points}
            color="#00D4AA"
            lineWidth={2}
            transparent
            opacity={opacity}
          />
        );
      })}
    </>
  );
};

const GlobeVisualization = () => {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(0, 0, 6);
  }, [camera]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4F46E5" />
      
      <Globe />
      
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={4}
        maxDistance={10}
        autoRotate={false}
      />
    </>
  );
};

const ResponsiveGlobe = () => {
  return (
    <div className="w-full h-[400px] md:h-[500px] lg:h-[600px] rounded-lg overflow-hidden bg-gradient-to-br from-background via-background-secondary to-background">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <GlobeVisualization />
      </Canvas>
    </div>
  );
};

export default ResponsiveGlobe;