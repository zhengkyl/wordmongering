import { Link } from "wouter-preact";
import { PageLayout } from "../components/PageLayout";

export function HomePage() {
  return (
    <PageLayout>
      <h1 class="mt-16 font-bold text-2xl sm:text-4xl tracking-wide">WORDMONGERING</h1>
      <div class="flex flex-col gap-3">
        <Link href="/daily/today" class="btn-lg btn-orange px-12">
          PLAY DAILY
        </Link>
        <Link href="/archive" class="btn btn-sec">
          Archive
        </Link>
      </div>
    </PageLayout>
  );
}
