import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import GlobeVisualization from "./GlobeVisualization";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();
  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-20">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background-secondary to-background" />
      <div className="absolute inset-0 bg-gradient-secondary opacity-50" />
      
      <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10">
        {/* Left Content */}
        <div className="space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium backdrop-blur-sm">
            Decentralized Solar Investment & Carbon Credits Trading Platform
          </div>
          
          {/* Hero Text */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              <span className="text-primary">Invest in Solar</span>
              <br />
              <span className="text-foreground">Energy,</span>
              <br />
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                Power the Future
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-foreground/80 leading-relaxed max-w-lg">
              A blockchain-powered platform connecting investors, landowners, 
              and corporations to accelerate the global transition to renewable 
              energy.
            </p>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="hero"
              size="lg"
              className="group"
              onClick={() => navigate("/marketplace")}
            >
              Become an Investor
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/projects")}
            >
              List Your Solar Project
            </Button>
          </div>
        </div>
        
        {/* Right Content - Globe Visualization */}
        <div className="flex justify-center lg:justify-end order-first lg:order-last">
          <GlobeVisualization />
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-1/4 left-10 w-2 h-2 bg-primary rounded-full animate-pulse" />
      <div className="absolute top-1/3 right-20 w-1 h-1 bg-network-connection rounded-full animate-pulse delay-300" />
      <div className="absolute bottom-1/4 left-1/4 w-1.5 h-1.5 bg-network-zone rounded-full animate-pulse delay-700" />
    </section>
  );
};

export default HeroSection;
