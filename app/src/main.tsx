import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import { App } from "./ui/App";

// Intentionally NOT using React.StrictMode here.
// StrictMode double-mounts effects in dev; a second WebGLRenderer on the same
// canvas kills the first context and leaves a blank/broken white rectangle.
createRoot(document.getElementById("root")!).render(<App />);
