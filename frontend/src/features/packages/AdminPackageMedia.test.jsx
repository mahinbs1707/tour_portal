import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages.js";
import { AdminPackageMediaPanel } from "./AdminPackageMediaPanel.jsx";

const {
  getAdminPackageMock,
  uploadAdminPackageCoverMock,
  clearAdminPackageCoverMock,
  uploadAdminPackageAdditionalMock,
  removeAdminPackageAdditionalMock,
} = vi.hoisted(() => ({
  getAdminPackageMock: vi.fn(),
  uploadAdminPackageCoverMock: vi.fn(),
  clearAdminPackageCoverMock: vi.fn(),
  uploadAdminPackageAdditionalMock: vi.fn(),
  removeAdminPackageAdditionalMock: vi.fn(),
}));

vi.mock("./packagesApi.js", async () => {
  const actual = await vi.importActual("./packagesApi.js");
  return {
    ...actual,
    getAdminPackage: getAdminPackageMock,
    uploadAdminPackageCover: uploadAdminPackageCoverMock,
    clearAdminPackageCover: clearAdminPackageCoverMock,
    uploadAdminPackageAdditional: uploadAdminPackageAdditionalMock,
    removeAdminPackageAdditional: removeAdminPackageAdditionalMock,
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  getAdminPackageMock.mockResolvedValue({
    id: "pkg-1",
    cover_image: "",
    additional_images: [],
  });
});

describe("Admin package media", () => {
  it("renders empty media state for a package", async () => {
    render(<AdminPackageMediaPanel packageId="pkg-1" />);
    expect(
      await screen.findByRole("heading", { name: messages.packages.mediaTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(messages.packages.mediaCoverEmpty)).toBeInTheDocument();
    expect(
      screen.getByText(messages.packages.mediaAdditionalEmpty),
    ).toBeInTheDocument();
  });

  it("uploads cover via multipart API helper", async () => {
    const user = userEvent.setup();
    uploadAdminPackageCoverMock.mockResolvedValue({
      id: "pkg-1",
      cover_image: "/media/packages/pkg-1/cover-abc.jpg",
      additional_images: [],
    });

    render(<AdminPackageMediaPanel packageId="pkg-1" />);
    await screen.findByRole("heading", { name: messages.packages.mediaTitle });

    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "cover.jpg", {
      type: "image/jpeg",
    });
    const input = screen.getByTestId("admin-package-cover-input");
    await user.upload(input, file);

    await waitFor(() => {
      expect(uploadAdminPackageCoverMock).toHaveBeenCalledWith("pkg-1", file);
    });
    const preview = await screen.findByTestId("admin-package-cover-preview");
    expect(preview).toHaveAttribute("src", "/media/packages/pkg-1/cover-abc.jpg");
    expect(preview).toHaveAttribute("alt", messages.packages.mediaCoverAlt);
  });

  it("rejects disallowed client-side types before calling API", async () => {
    render(<AdminPackageMediaPanel packageId="pkg-1" />);
    await screen.findByRole("heading", { name: messages.packages.mediaTitle });

    const file = new File([new Uint8Array([0x47, 0x49, 0x46])], "anim.gif", {
      type: "image/gif",
    });
    // fireEvent bypasses the accept= filter that userEvent.upload honors.
    fireEvent.change(screen.getByTestId("admin-package-cover-input"), {
      target: { files: [file] },
    });

    expect(
      await screen.findByText(messages.packages.errors.mediaType),
    ).toBeInTheDocument();
    expect(uploadAdminPackageCoverMock).not.toHaveBeenCalled();
  });

  it("clears cover and removes additional image after confirm", async () => {
    const user = userEvent.setup();
    getAdminPackageMock.mockResolvedValue({
      id: "pkg-1",
      cover_image: "/media/packages/pkg-1/cover.jpg",
      additional_images: ["/media/packages/pkg-1/a0.jpg"],
    });
    clearAdminPackageCoverMock.mockResolvedValue({
      id: "pkg-1",
      cover_image: "",
      additional_images: ["/media/packages/pkg-1/a0.jpg"],
    });
    removeAdminPackageAdditionalMock.mockResolvedValue({
      id: "pkg-1",
      cover_image: "",
      additional_images: [],
    });

    render(<AdminPackageMediaPanel packageId="pkg-1" />);
    await screen.findByTestId("admin-package-cover-preview");

    await user.click(screen.getByTestId("admin-package-cover-clear"));
    const clearDialog = await screen.findByRole("dialog", {
      name: messages.packages.confirmClearCoverTitle,
    });
    await user.click(
      within(clearDialog).getByRole("button", {
        name: messages.packages.mediaClearCover,
      }),
    );
    await waitFor(() => {
      expect(clearAdminPackageCoverMock).toHaveBeenCalledWith("pkg-1");
    });
    expect(
      await screen.findByText(messages.packages.mediaCoverEmpty),
    ).toBeInTheDocument();

    await user.click(screen.getByTestId("admin-package-additional-remove-0"));
    const removeDialog = await screen.findByRole("dialog", {
      name: messages.packages.confirmRemoveAdditionalTitle,
    });
    await user.click(
      within(removeDialog).getByRole("button", {
        name: messages.packages.mediaRemoveAdditional,
      }),
    );
    await waitFor(() => {
      expect(removeAdminPackageAdditionalMock).toHaveBeenCalledWith("pkg-1", 0);
    });
    expect(
      await screen.findByText(messages.packages.mediaAdditionalEmpty),
    ).toBeInTheDocument();
  });

  it("appends additional image", async () => {
    uploadAdminPackageAdditionalMock.mockResolvedValue({
      id: "pkg-1",
      cover_image: "",
      additional_images: ["/media/packages/pkg-1/a0.png"],
    });

    render(<AdminPackageMediaPanel packageId="pkg-1" />);
    await screen.findByRole("heading", { name: messages.packages.mediaTitle });

    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "a.png", {
      type: "image/png",
    });
    fireEvent.change(screen.getByTestId("admin-package-additional-input"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(uploadAdminPackageAdditionalMock).toHaveBeenCalledWith("pkg-1", file);
    });
    expect(
      await screen.findByTestId("admin-package-additional-item-0"),
    ).toBeInTheDocument();
  });
});
