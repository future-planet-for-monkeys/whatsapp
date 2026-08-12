// ---------------------------------------------------------------------------
// Augment Express's Request type so that `request.user` is available after
// JWT authentication without manual casting.
// ---------------------------------------------------------------------------

declare namespace Express {
  interface Request {
    /**
     * Populated by the `jwtAuth` security scheme in the auth middleware.
     * Contains the decoded JWT payload (`userId` and `name`).
     */
    user?: { userId: string; name: string };
  }
}