import { Outlet } from "react-router";
import Navbar from "./components/Navbar";

function App() {
  return (
    <div className="flex flex-col h-screen bg-gray-300">
      <Navbar />
      <main className="container mx-auto flex-grow overflow-y-auto px-20  bg-gray-300 border-black border-x-1">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
