import type { ReactElement, ReactNode } from "react";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import { ME, SERVER_INFO } from "@/graphql/account";
import { AuthProvider } from "@/contexts/AuthContext";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const testUser = {
  __typename: "User" as const,
  id: "u1",
  email: "taro@example.com",
  emailVerified: true,
  name: "太郎",
  defaultMachineType: "DAM" as const,
  language: "en" as const,
  createdAt: "2026-01-01T00:00:00Z",
};

export const meMock: MockedResponse = {
  request: { query: ME },
  result: { data: { me: testUser } },
};

export const serverInfoMock = (overrides: Record<string, unknown> = {}): MockedResponse => ({
  request: { query: SERVER_INFO },
  result: {
    data: {
      serverInfo: {
        __typename: "ServerInfo",
        ocrEnabled: true,
        youtubeSearchEnabled: false,
        mailEnabled: false,
        passwordMinLength: 12,
        passwordMaxBytes: 72,
        maxUploadBytes: 10485760,
        maxImportRows: 5000,
        machines: [],
        ...overrides,
      },
    },
  },
});

export function renderWithProviders(ui: ReactElement, mocks: MockedResponse[] = [], route = "/") {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={[meMock, serverInfoMock(), ...mocks]}>
      <ThemeProvider>
        <AuthProvider>
          <PlayerProvider>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
          </PlayerProvider>
        </AuthProvider>
      </ThemeProvider>
    </MockedProvider>
  );
  return render(ui, { wrapper: Wrapper });
}
