import {React, useState, useEffect} from "react";
import { useTheme } from "next-themes";

const WorkCard = ({ img, name, description, onClick }) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState();
  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <div
      className={`border-2 border-black overflow-hidden rounded-lg p-2 transition-all ease-out duration-300 ${
        mounted && theme === "dark" ? "hover:bg-slate-800" : "hover:bg-slate-50"
      } hover:scale-105 link laptop:p-4 first:ml-0`}
      onClick={onClick}
    >
      <h1 className="mt-5 text-3xl font-medium">
        {name ? name : "Project Name"}
      </h1>
      <h2 className="text-xl opacity-50">
        {description ? description : "Description"}
      </h2>
    </div>
  );
};

export default WorkCard;
