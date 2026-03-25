import React from "react";
import { render, screen } from "@testing-library/react";
import { ChatShell } from "./chat-shell";

describe("ChatShell", () => {
  it("renders the chat composer and starter copy", () => {
    render(<ChatShell />);

    expect(screen.getByText("Contract-first AI chat")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Message Neutrino")).toBeInTheDocument();
  });
});
