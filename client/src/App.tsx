import { flushSync } from "preact/compat";
import { Route, Router, type AroundNavHandler } from "wouter-preact";
import { ArchivePage } from "./pages/ArchivePage";
import { DailyGamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";

// Registered at module load time — before Preact renders and before wouter's
// useEffect subscription runs — so this fires first on popstate.
{
  let skipNext = false;
  window.addEventListener("popstate", (event) => {
    if (skipNext) {
      skipNext = false;
      return;
    }
    if (!document.startViewTransition) return;
    event.stopImmediatePropagation();
    document.startViewTransition(() => {
      flushSync(() => {
        skipNext = true;
        window.dispatchEvent(new PopStateEvent("popstate", { state: event.state, bubbles: true }));
      });
    });
  });
}

const aroundNav: AroundNavHandler = (navigate, to, options) => {
  if (!document.startViewTransition) {
    navigate(to, options);
    return;
  }
  document.startViewTransition(() => {
    flushSync(() => {
      navigate(to, options);
    });
  });
};

export function App() {
  return (
    <Router aroundNav={aroundNav}>
      <Route path="/" component={HomePage} />
      <Route path="/archive" component={ArchivePage} />
      <Route path="/daily/:day" component={DailyGamePage} />
    </Router>
  );
}
