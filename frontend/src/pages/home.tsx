import  { useEffect, useState } from "react";
// import { Button } from "primereact/button";
import { MultiSelect } from "primereact/multiselect";
import type { PersonalBest } from "../schema/types";
import "./home.css";

interface Swimmer {
  id: number;
  name: string;
  surname: string;
}

function Home() {
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [selectedSwimmers, setSelectedSwimmers] = useState<Array<number>>([]);
  const [containerHeight, setContainerHeight] = useState<string>("100vh");
  const [personalBests, setPersonalBests] = useState<Array<PersonalBest>>([]);

  useEffect(() => {
    const navbar = document.querySelector(".nav");
    const navbarHeight = navbar ? navbar.clientHeight : 0;

    setContainerHeight(`calc(100vh - ${navbarHeight}px)`);
  }, []);

  useEffect(() => {
    const fetchSwimmers = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/swimmers");
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        setSwimmers(data);
      } catch (error) {
        console.error("Error fetching swimmers:", error);
      }
    };

    fetchSwimmers();
  }, []);

  const handleFetchPersonalBests = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/personal_bests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          swimmer_ids: selectedSwimmers,
          discipline_ids: [1], // Fixed discipline ID
          course: 25, // Fixed course length
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch personal bests");
      }

      const data = await response.json();
      setPersonalBests(data);
      console.log("Personal Bests:", data);
    } catch (error) {
      console.error("Error fetching personal bests:", error);
    }
  };

  const swimmerOptions = swimmers
    .map((swimmer) => ({
      value: swimmer.id,
      name: `${swimmer.surname} ${swimmer.name}`,
    }))
    .sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });

  const setSwimmerLabel = (selectedSwimmers: Array<number>) => {
    const selectedCount = selectedSwimmers.length;
    if (selectedCount === 0) {
      return "No swimmers selected";
    }
    if (selectedCount > 1 && selectedCount < 5) {
      return `${selectedCount} plavci vybráni`;
    }
    return `${selectedCount} plavců vybráno`;
  };
  return (
    <div
      className="home-container bg-blue-300"
      style={{ height: containerHeight }}
    >
      <div className="flex flex-row gap-20 h-15 justify-center  bg-amber-100">
        <div className="box">
          <MultiSelect
            value={selectedSwimmers}
            onChange={(e) => setSelectedSwimmers(e.value)}
            options={swimmerOptions}
            optionLabel="name"
            display="chip"
            placeholder="Select Swimmers"
            maxSelectedLabels={1}
            className="w-full lg:w-100 h-full"
            showSelectAll={true}
            selectedItemsLabel={setSwimmerLabel(selectedSwimmers)}
          />
        </div>
        <button
          className="bg-blue-700 text-white px-2 rounded mt-2 mb-2"
          onClick={handleFetchPersonalBests}
          // onClick={() => {
          //   console.log("Selected Swimmers:", selectedSwimmers);
          // }}
        >
          Show Selected Swimmers
        </button>
      </div>
      <div className="box results-box text-2xl border-2 border-black bg-green-200">
        <h2 className="text-xl font-bold mb-4">Personal Bests</h2>
        {personalBests.length > 0 ? (
          <ul>
            {personalBests.map((pb, index) => (
              <li key={index} className="mb-2">
                <span className="font-bold">
                  {pb.swimmer.surname} {pb.swimmer.name}
                </span>{" "}
                -<span> {pb.discipline.title}</span> -
                <span>
                  {" "}
                  {Math.floor(pb.time / 1000)}.{pb.time % 1000}s
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No personal bests to display</p>
        )}
      </div>
    </div>
  );
}

export default Home;
