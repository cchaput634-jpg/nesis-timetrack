import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { TimerProvider } from "./context/TimerContext";
import { ProfileProvider } from "./context/ProfileContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* ProfileProvider est au sommet : tous les hooks de données écoutent
        le profil actif pour recharger. TimerProvider en dessous : le state
        du chrono survit aux changements d'onglet mais pas aux changements
        de profil (chaque profil a son propre historique de sessions). */}
    <ProfileProvider>
      <TimerProvider>
        <App />
      </TimerProvider>
    </ProfileProvider>
  </React.StrictMode>
);
