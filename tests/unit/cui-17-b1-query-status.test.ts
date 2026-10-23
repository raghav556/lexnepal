import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  result: {
    data: undefined as unknown,
    isLoading: true,
    isError: false,
    isFetched: false,
    isFetching: true,
    error: null as unknown,
    refetch: vi.fn(),
  },
  useQuery: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => {
    state.useQuery(options);
    return state.result;
  },
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));
vi.mock("@/client/queries/identity", () => ({ useCurrentIdentityUser: () => ({ id: "user-1" }) }));
vi.mock("@/client/queries/collection", () => ({ useCollectionQuery: () => state.result }));
import { useNotifications, useUnreadMessageCounts } from "@/client/queries/communication";
import { useAppointments } from "@/client/queries/crm";

beforeEach(() => {
  state.result = {
    data: undefined,
    isLoading: true,
    isError: false,
    isFetched: false,
    isFetching: true,
    error: null,
    refetch: vi.fn(),
  };
});

describe("B1 additive shared query status contracts", () => {
  it("keeps existing unread map/fetched/loading fields and reports pending without data", () => {
    const q = useUnreadMessageCounts(["matter-b", "matter-a"]);
    expect(q.data).toEqual({});
    expect(q.isLoading).toBe(true);
    expect(q.isFetched).toBe(false);
    expect(q.hasData).toBe(false);
    expect(state.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["messages", "unread", "matter-a,matter-b"],
        enabled: true,
        refetchInterval: 10_000,
      }),
    );
  });
  it("keeps unread failure distinguishable from a successful zero response", () => {
    state.result = {
      ...state.result,
      isLoading: false,
      isFetching: false,
      isFetched: true,
      isError: true,
      error: { status: 500 },
    };
    const q = useUnreadMessageCounts(["matter-a"]);
    expect(q.hasData).toBe(false);
    expect(q.isError).toBe(true);
    expect(q.error).toEqual({ status: 500 });
    expect(q.refetch).toBe(state.result.refetch);
    state.result = { ...state.result, data: { "matter-a": 0 }, isError: false, error: null };
    expect(useUnreadMessageCounts(["matter-a"])).toMatchObject({
      data: { "matter-a": 0 },
      hasData: true,
      isError: false,
    });
  });
  it("preserves cached unread data on refetch failure for existing consumers", () => {
    state.result = {
      ...state.result,
      data: { "matter-a": 4 },
      isLoading: false,
      isError: true,
      isFetched: true,
    };
    expect(useUnreadMessageCounts(["matter-a"])).toMatchObject({
      data: { "matter-a": 4 },
      hasData: true,
      isLoading: false,
      isError: true,
      isFetched: true,
    });
  });
  it("does not enable unread requests with no authorized matter IDs", () => {
    useUnreadMessageCounts([]);
    expect(state.useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
  it.each([useNotifications, useAppointments])(
    "keeps the existing array fallback while exposing real data availability",
    (hook) => {
      expect(hook()).toMatchObject({ data: [], hasData: false, isLoading: true });
      state.result = { ...state.result, data: [], isLoading: false, isFetching: false };
      expect(hook()).toMatchObject({ data: [], hasData: true, isLoading: false });
      state.result = { ...state.result, isError: true, error: { status: 500 } };
      expect(hook()).toMatchObject({ data: [], hasData: true, isError: true });
    },
  );
});
