import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { messages } from "../../i18n/messages.js";
import { BookingConfirmationPage } from "./BookingConfirmationPage.jsx";

describe("BookingConfirmationPage", () => {
  it("shows reference and always displays PENDING even if status query differs", () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/app/bookings/confirmation?reference=ABCDEF123456&status=APPROVED",
        ]}
      >
        <BookingConfirmationPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("booking-confirmation-reference")).toHaveTextContent(
      "ABCDEF123456",
    );
    expect(screen.getByTestId("booking-confirmation-status")).toHaveTextContent(
      "PENDING",
    );
    expect(
      screen.getByRole("heading", { name: messages.booking.confirmationTitle }),
    ).toBeInTheDocument();
  });
});
