import { Suspense } from "react";
import { AllToolsView } from "@desktop/views/views";

export default function Page() {
  return (
    <Suspense>
      <AllToolsView />
    </Suspense>
  );
}
