import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx"; // symlink先

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary reportUrl={`${import.meta.env.VITE_API_BASE_URL}/report-client-error`}>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
