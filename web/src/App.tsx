import { Suspense, lazy, useEffect, useState, type ComponentType } from "react";
import { D } from "./data";
import { OverlayProvider, useHideTip, useModal } from "./components/overlay";
import { Icon } from "./components/ui";
import { PAGES, type PageId } from "./lib/constants";
import Audience from "./pages/Audience";
import Brands from "./pages/Brands";
import Home from "./pages/Home";
import Match from "./pages/Match";
import Packages from "./pages/Packages";
import Planner from "./pages/Planner";
import Safety from "./pages/Safety";
import Slots from "./pages/Slots";

// Hidden page: reachable only by typing #journey, not listed in the menu.
const Journey = lazy(() => import("./journey/Journey"));

const ROUTES: Record<PageId, ComponentType> = { home: Home, match: Match, slots: Slots, packages: Packages, safety: Safety, audience: Audience, brands: Brands, planner: Planner };

function readHash(): PageId {
  const id = (location.hash || "#home").slice(1);          // "content" was merged into the overview
  return id in ROUTES ? (id as PageId) : "home";
}

function Shell() {
  const [page, setPage] = useState<PageId>(readHash);
  const { gloss, close } = useModal();
  const hideTip = useHideTip();
  useEffect(() => {
    const on = () => { setPage(readHash()); close(); hideTip(); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, [close, hideTip]);
  const Page = ROUTES[page];
  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><i className="onair" aria-hidden="true" /><div><b>ReachRadar</b><span>หลังบ้านทีมการตลาด · โหนกระแส</span></div></div>
        <nav className="nav" aria-label="เมนู">
          {PAGES.map((p) => "group" in p
            ? <span className="ngroup" key={p.group}>{p.group}</span>
            : <a key={p.id} href={"#" + p.id} className={p.cta ? "cta" : undefined} aria-current={p.id === page ? "page" : undefined}><Icon d={p.ico} />{p.name}</a>)}
        </nav>
        <div className="foot">
          <button className="linkbtn" type="button" onClick={() => gloss()}>คำศัพท์ที่ใช้ในหน้านี้</button>
          <span>{`ข้อมูล ${D.date_range[0]} ถึง ${D.date_range[1]} · อัปเดต ${D.generated.slice(0, 10)}`}</span>
        </div>
      </aside>
      <main><Page key={page} /></main>
    </div>
  );
}

export default function App() {
  const [hidden, setHidden] = useState(() => location.hash === "#journey");
  useEffect(() => {
    const on = () => setHidden(location.hash === "#journey");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  if (hidden) return <Suspense fallback={null}><Journey /></Suspense>;
  return <OverlayProvider><Shell /></OverlayProvider>;
}
