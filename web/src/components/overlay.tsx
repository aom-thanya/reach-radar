import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { GLOSS } from "../lib/constants";

// ---------- tooltip ----------
type TipState = { text: string; x: number; y: number } | null;
type TipHandlers = {
  onMouseMove: (e: React.MouseEvent) => void; onMouseLeave: () => void;
  onFocus: (e: React.FocusEvent) => void; onBlur: () => void;
};
const TipCtx = createContext<{ bind: (text: string) => TipHandlers; hide: () => void }>(null!);
export const useTip = () => useContext(TipCtx).bind;

function Tip({ state }: { state: TipState }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const n = ref.current;
    if (!n || !state) return;
    n.style.left = Math.min(state.x + 12, innerWidth - n.offsetWidth - 8) + "px";
    n.style.top = Math.max(state.y - n.offsetHeight - 10, 8) + "px";
  }, [state]);
  return <div id="tip" ref={ref} hidden={!state}>{state?.text}</div>;
}

// ---------- dialog ----------
type ModalState = { title: string; body: ReactNode; gloss?: string } | null;
const ModalCtx = createContext<{ open: (title: string, body: ReactNode) => void; gloss: (word?: string) => void; close: () => void }>(null!);
export const useModal = () => useContext(ModalCtx);

function Glossary({ word }: { word?: string }) {
  return (
    <dl className="gloss">
      {GLOSS.map(([t, d]) => [
        <dt key={t + "t"} className={t === word ? "hl" : undefined} id={"g-" + t}>{t}</dt>,
        <dd key={t + "d"}>{d}</dd>,
      ])}
    </dl>
  );
}

function Dialog({ state, onClose }: { state: ModalState; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const d = ref.current!;
    if (state) {
      if (typeof d.showModal === "function") { if (!d.open) d.showModal(); } else d.setAttribute("open", "");
      d.scrollTop = 0;
      if (body.current) body.current.scrollTop = 0;
      if (state.gloss) document.getElementById("g-" + state.gloss)?.scrollIntoView({ block: "center" });
    } else if (d.open) d.close();
  }, [state]);
  return (
    <dialog ref={ref} aria-labelledby="dlg-title" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="dlg-head">
        <h2 id="dlg-title">{state?.title}</h2>
        <button className="xbtn" type="button" aria-label="ปิด" onClick={onClose}>×</button>
      </div>
      <div className="dlg-body" ref={body}>{state?.body}</div>
    </dialog>
  );
}

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<TipState>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const hide = useCallback(() => setTip(null), []);
  const bind = useCallback((text: string): TipHandlers => ({
    onMouseMove: (e) => setTip({ text, x: e.clientX, y: e.clientY }),
    onFocus: (e) => { const r = (e.currentTarget as Element).getBoundingClientRect(); setTip({ text, x: r.left + r.width / 2, y: r.top }); },
    onMouseLeave: hide, onBlur: hide,
  }), [hide]);
  const modalApi = useMemo(() => ({
    open: (title: string, body: ReactNode) => { setTip(null); setModal({ title, body }); },
    gloss: (word?: string) => { setTip(null); setModal({ title: "คำศัพท์ที่ใช้ในหน้านี้", body: <Glossary word={word} />, gloss: word }); },
    close: () => setModal(null),
  }), []);
  const tipApi = useMemo(() => ({ bind, hide }), [bind, hide]);
  return (
    <TipCtx.Provider value={tipApi}>
      <ModalCtx.Provider value={modalApi}>
        {children}
        <Dialog state={modal} onClose={modalApi.close} />
        <Tip state={tip} />
      </ModalCtx.Provider>
    </TipCtx.Provider>
  );
}
export const useHideTip = () => useContext(TipCtx).hide;
