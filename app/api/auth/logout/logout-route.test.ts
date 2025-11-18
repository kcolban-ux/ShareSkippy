/** @jest-environment node */

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from "@jest/globals";
type SupabaseServerClient = Awaited<
    ReturnType<typeof import("@/libs/supabase/server").createClient>
>;

type LogoutRouteModule = typeof import("./route");
type LogoutRoutePOST = LogoutRouteModule["POST"];

const mockSignOut = jest.fn<() => Promise<{ error: Error | null }>>();
const mockClient = {
    auth: {
        signOut: mockSignOut,
    },
} as unknown as SupabaseServerClient;

const mockCookieStore = {
    getAll: jest.fn(() => []),
    set: jest.fn(),
    setAll: jest.fn(() => {}),
};

const mockCreateServerClient = jest.fn(() => mockClient);

const loadLogoutRoutePOST = async (): Promise<LogoutRoutePOST> => {
    // @ts-expect-error NodeNext enforces file extensions, but Jest uses ts-jest to resolve the .ts file.
    const module: LogoutRouteModule = await import("./route");
    return module.POST;
};

jest.mock("next/headers", () => ({
    cookies: jest.fn(() => mockCookieStore),
}));

jest.mock("@supabase/ssr", () => ({
    createServerClient: mockCreateServerClient,
}));

describe("Logout API Route", () => {
    let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSignOut.mockReset();
        mockCreateServerClient.mockReturnValue(mockClient);
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(
            () => {},
        );
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it("returns a successful JSON response when the Supabase signOut call succeeds", async () => {
        const POST = await loadLogoutRoutePOST();
        mockSignOut.mockResolvedValue({ error: null });

        const response = await POST();

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ error: null });
    });

    it("propagates Supabase errors with a 500 status", async () => {
        const POST = await loadLogoutRoutePOST();
        const supabaseError = new Error("session clear failed");
        mockSignOut.mockResolvedValue({ error: supabaseError });

        const response = await POST();

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({
            error: supabaseError.message,
        });
        expect(consoleErrorSpy).toHaveBeenCalled();
    });
});
