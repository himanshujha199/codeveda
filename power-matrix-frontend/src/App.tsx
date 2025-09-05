import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import MarketPlace from "./pages/MarketPlace";
import MarketCap from "./pages/MarketCap";
import Login from "./pages/Login";
import { GoogleOAuthProvider } from "@react-oauth/google";
const queryClient = new QueryClient();

const App = () => (
  <GoogleOAuthProvider clientId="779189944163-8odr3mceb8ks1v3vh7gphuj49nh2n6ot.apps.googleusercontent.com">
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          <Route path="/dashboard" element={<Dashboard/>} />
          <Route path="/marketplace" element={<MarketPlace/>} />
          <Route path='/marketcap' element={<MarketCap/>} />
          <Route path='/login' element={<Login/>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </GoogleOAuthProvider>
);

export default App;
