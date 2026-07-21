import { Controller, Route, Tags, Post, Body, Security } from "tsoa";
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
   */
  @Post("signup")
  @Security("bearerAuth")
  @Security("basicAuth")
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
}