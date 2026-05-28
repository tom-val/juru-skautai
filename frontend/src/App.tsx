import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Founder from "./pages/Founder";
import History from "./pages/History";
import Attributes from "./pages/Attributes";
import Song from "./pages/Song";
import Abilities from "./pages/Abilities";
import AbilityDetail from "./pages/AbilityDetail";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/skautu-ikurejas" element={<Founder />} />
        <Route path="/istorija" element={<History />} />
        <Route path="/atributika" element={<Attributes />} />
        <Route path="/daina" element={<Song />} />
        <Route path="/gebejimai" element={<Abilities />} />
        <Route path="/gebejimai/:slug" element={<AbilityDetail />} />
      </Route>
    </Routes>
  );
}
