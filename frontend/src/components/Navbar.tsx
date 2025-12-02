import { NavLink } from "react-router";

type LinkState = { isActive: boolean };

const Navbar = () => {
  const navLinkStyle = ({ isActive }: LinkState) => ({
    fontWeight: "bold",
    margin: "0 10px",
    color: isActive ? "var(--color-primary)" : "black",
  });

  return (
    <nav className="bg-white border-b">
      <div className="container mx-auto flex justify-between h-12 px-20">
        <div className="flex items-center gap-2 ">
          <img src="/swimmer-solid.svg" alt="logo" className="h-10 w-10" />
          <span
            className="text-lg "
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--color-text)",
            }}
          >
            Plavdata
          </span>
          <div className="flex items-center gap-1 pl-10">
            <NavLink to="/" style={navLinkStyle}>
              Domů
            </NavLink>
            <NavLink to="/compare-swimmers" style={navLinkStyle}>
              Porovnání plavců
            </NavLink>
            <NavLink to="/personal-bests" style={navLinkStyle}>
              Osobní rekordy
            </NavLink>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="px-3 py-1 rounded bg-transparent"
            style={{ color: "var(--color-secondary)" }}
          >
            Přihlásit
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
