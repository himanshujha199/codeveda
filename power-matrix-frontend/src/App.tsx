import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import MarketPlace from "./pages/MarketPlace";
import MarketCap from "./pages/MarketCap";
import Login from "./pages/Login";
import Projects from "./pages/Projects";
import Regulator from "@/pages/Regulator";
import Community from "./pages/Community";
import { useIsRegulator } from "@/blockchain/useRegulator";
import { GoogleOAuthProvider } from "@react-oauth/google";
const queryClient = new QueryClient();

// ---- Route Guards ----
const RequireAuth = () => {
  const location = useLocation();
  const user = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
};

const NonRegulatorOnly = () => {
  // Gate dashboard for regulator accounts
  const isReg = useIsRegulator();
  if (isReg) {
    return <Navigate to="/regulator" replace />;
  }
  return <Outlet />;
};

// Listen to wallet/account changes and redirect to dashboard
const WalletRouteSync = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth?.on) return;
    const toDash = () => navigate('/dashboard', { replace: true });
    eth.on('accountsChanged', toDash);
    eth.on('chainChanged', toDash);
    return () => {
      eth.removeListener?.('accountsChanged', toDash);
      eth.removeListener?.('chainChanged', toDash);
    };
  }, [navigate]);
  return null;
};

const App = () => (
  <GoogleOAuthProvider clientId="779189944163-8odr3mceb8ks1v3vh7gphuj49nh2n6ot.apps.googleusercontent.com">
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <WalletRouteSync />
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          <Route element={<RequireAuth />}>
            <Route element={<NonRegulatorOnly />}>
              <Route path="/dashboard" element={<Dashboard/>} />
            </Route>
            <Route path="/marketplace" element={<MarketPlace/>} />
            <Route path="/community" element={<Community />} />
          </Route>
          <Route path='/marketcap' element={<MarketCap/>} />
          <Route path="/projects" element={<Projects/>} />
          <Route path='/login' element={<Login/>} />
          <Route path="/regulator" element={<Regulator />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </GoogleOAuthProvider>
);

export default App;
