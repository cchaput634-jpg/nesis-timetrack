import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { TimerProvider } from "./context/TimerContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* TimerProvider englobe l'app pour que le chrono survive au changement
        d'onglet (le state serait sinon reset au démontage de TimerCard). */}
    <TimerProvider>
      <App />
    </TimerProvider>
  </React.StrictMode>
);
