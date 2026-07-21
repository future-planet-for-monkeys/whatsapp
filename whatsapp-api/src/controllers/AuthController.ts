import { Controller, Route, Tags, Post, Get, Body, Security, Request } from "tsoa";
import type { Request as ExpressRequest } from "express";
import {
  createUser,
  authenticateUser,
  signJWT,
  type JWTContents,
  type CreateUserRequest,
} from "../services/AuthService";

// Re-export types so the generated Swagger docs include them.
export type { JWTContents, CreateUserRequest, UserModel } from "../services/AuthService";

@Route("auth")
@Tags("Auth")
export class AuthController extends Controller {
  /**
   * Register a new user who will share the WhatsApp session.
   * Each user gets their own read/sent/seen state.
   *
   * Security: API token (X-Api-Token header) or Basic Auth.
   * Admin-only — only someone with the API token can create users.
   */
  @Post("signup")
  @Security("bearerAuth")
  public async signup(
    @Body() body: CreateUserRequest,
  ): Promise<{ token: string; user: JWTContents }> {
    const user = await createUser(body);
    const token = signJWT(user);
    this.setStatus(201);
    return { token, user };
  }

  /**
   * Authenticate with phone number + password.
   * Returns a JWT which should be sent as `Authorization: Bearer <token>`.
   *
   * Security: API token (X-Api-Token header) or Basic Auth.
   */
  @Post("login")
  @Security("bearerAuth")
  @Security("basicAuth")
  public async login(
    @Body() body: { phoneNumber: string; password: string },
  ): Promise<{ token: string; user: JWTContents }> {
    const user = await authenticateUser(body.phoneNumber, body.password);
    const token = signJWT(user);
    return { token, user };
  }

  /**
   * Returns the currently authenticated user's info.
   * Useful for validating that a JWT is still valid and who it belongs to.
   *
   * Security: JWT (Authorization: Bearer <token>).
   */
  @Get("me")
  @Security("jwtAuth")
  public async me(
    @Request() request: ExpressRequest,
  ): Promise<JWTContents> {
    // The auth middleware decoded the JWT and attached it to request.user
    return request.user!;
  }
}