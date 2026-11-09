import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeTheme } from "./utils/themes";

// Restore the user's saved color palette before first paint to avoid a flash.
initializeTheme();

createRoot(document.getElementById("root")!).render(<App />);
