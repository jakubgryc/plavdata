import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { PrimeReactProvider } from "primereact/api";
import { MantineProvider } from "@mantine/core";
import Home from "./pages/home";
import CompareSwimmers from "./pages/compareSwimmers";
import PersonalBests from "./pages/personalBests";
import "./App.css";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "@mantine/core/styles.css";

function App() {
  return (
    <MantineProvider>
      <PrimeReactProvider>
        <Router>
          <nav className="nav flex items-center">
            <h1 className="font-bold text-2xl pl-20">PlavData</h1>
            <div className="nav-links">
              <Link to="/" style={{ margin: "0 10px" }}>
                Home
              </Link>
              <Link to="/compare-swimmers" style={{ margin: "0 10px" }}>
                Compare Swimmers
              </Link>
              <Link to="/personal-bests" style={{ margin: "0 10px" }}>
                Personal Bests
              </Link>
            </div>
          </nav>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/compare-swimmers" element={<CompareSwimmers />} />
            <Route path="/personal-bests" element={<PersonalBests />} />
          </Routes>
        </Router>
      </PrimeReactProvider>
    </MantineProvider>
  );
}

export default App;
