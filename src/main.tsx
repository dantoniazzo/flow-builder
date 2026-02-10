import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import { OAuthGoogle } from "./pages/OAuthGoogle";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/oauth/google" element={<OAuthGoogle />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
