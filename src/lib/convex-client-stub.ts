/**
 * Minimal stub of ConvexReactClient for the local offline preview.
 * Kept in a separate non-component file so Vite Fast Refresh does not
 * complain about mixing class exports with React component exports.
 */
export class ConvexReactClient {
  constructor(public url: string) {}
  setAuth() {}
  clearAuth() {}
}
