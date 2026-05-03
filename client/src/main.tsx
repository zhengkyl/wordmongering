import { render } from "preact";
import { App } from "./App";
import "@unocss/reset/tailwind.css";
import "virtual:uno.css";
import "./index.css";

render(<App />, document.getElementById("app")!);
