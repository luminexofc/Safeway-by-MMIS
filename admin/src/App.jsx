import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { OperatorProvider } from "./lib/operator";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

// Guard lives inside AdminDashboard (session + operators-team check).
export default function App() {
  return (
    <OperatorProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </OperatorProvider>
  );
}
