import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Session from "@/pages/session";
import TinkCallback from "@/pages/tink-callback";
import TableQR from "@/pages/table-qr";
import PaymentSuccess from "@/pages/payment-success";
import ParticipantJoin from "@/pages/participant-join";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/session/:id" component={Session} />
      <Route path="/join/:sessionId" component={ParticipantJoin} />
      <Route path="/payment-success/:sessionId" component={PaymentSuccess} />
      <Route path="/auth/tink/callback" component={TinkCallback} />
      <Route path="/table-qr" component={TableQR} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <footer className="fixed bottom-0 left-0 right-0 text-center py-2 z-10" style={{
          background: "url('@assets/a76a0c1a-43da-4af1-92f3-6326f9b4de38_1754313248853.jpg') no-repeat center center fixed",
          backgroundSize: "cover",
          backgroundAttachment: "fixed"
        }}>
          <p className="text-white font-bold text-sm" data-testid="footer-copyright">
            © 2025 PartiPay
          </p>
        </footer>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
