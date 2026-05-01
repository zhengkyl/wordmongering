import { Route, Switch } from "wouter-preact";
import { ArchivePage } from "./pages/ArchivePage";
import { DailyGamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";
import { TutorialPage } from "./pages/TutorialPage";

export function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/archive" component={ArchivePage} />
      <Route path="/daily/tutorial" component={TutorialPage} />
      <Route path="/daily/:day" component={DailyGamePage} />
    </Switch>
  );
}
