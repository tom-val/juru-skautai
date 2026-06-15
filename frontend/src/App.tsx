import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Founder from "./pages/Founder";
import History from "./pages/History";
import Attributes from "./pages/Attributes";
import Song from "./pages/Song";
import Songbook from "./pages/Songbook";
import Oaths from "./pages/Oaths";
import MemberEntry from "./pages/MemberEntry";
import LeadAuth from "./pages/LeadAuth";
import LeadDashboard from "./pages/LeadDashboard";
import MemberHome from "./pages/MemberHome";
import MemberAbilityDetail from "./pages/MemberAbilityDetail";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/skautu-ikurejas" element={<Founder />} />
        <Route path="/istorija" element={<History />} />
        <Route path="/atributika" element={<Attributes />} />
        <Route path="/daina" element={<Song />} />
        <Route path="/dainos" element={<Songbook />} />
        <Route path="/izodziai" element={<Oaths />} />

        {/* Abilities tracker: member entry, team-lead area, and member profiles. */}
        <Route path="/gebejimai" element={<MemberEntry />} />
        {/* The pre-account tracker lived at /gebejimai/:slug — send old links to the entry form. */}
        <Route path="/gebejimai/:slug" element={<Navigate to="/gebejimai" replace />} />
        <Route path="/vadovas" element={<LeadAuth />} />
        <Route path="/vadovas/skydelis" element={<LeadDashboard />} />
        <Route path="/narys/:memberId" element={<MemberHome />} />
        <Route path="/narys/:memberId/:slug" element={<MemberAbilityDetail />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
