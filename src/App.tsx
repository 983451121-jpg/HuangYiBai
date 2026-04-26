import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLayout from "./admin/AdminLayout";
import AdminHome from "./admin/pages/AdminHome";
import AdminInteract from "./admin/pages/AdminInteract";
import AdminScenic from "./admin/pages/AdminScenic";
import AdminProfile from "./admin/pages/AdminProfile";
import { ToastHost } from "./admin/Toast";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ToastHost />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminHome />} />
            <Route path="home" element={<AdminHome />} />
            <Route path="interact" element={<AdminInteract />} />
            <Route path="scenic" element={<AdminScenic />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
