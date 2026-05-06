import { Route, Switch } from "wouter-preact";
import { ArchivePage } from "./pages/ArchivePage";
import { DailyGamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";

export function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/archive" component={ArchivePage} />
      <Route path="/daily/:day" component={DailyGamePage} />
    </Switch>
  );
}
