import { useParams } from "react-router-dom";
import { CustomTourFormPage } from "./CustomTourFormPage.jsx";

/** Customer reapply flow — reuses create form with prefill (Story 8.4). */
export function CustomTourReapplyPage() {
  const { id } = useParams();
  return <CustomTourFormPage variant="reapply" tourId={id} />;
}