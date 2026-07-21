import { Controller, Route, Tags } from "tsoa";

@Route('auth')
@Tags('Auth')

export interface JWTContents {
    userId: string;
    name: string;
}

export class AuthController extends Controller {
    // login takes credentials produces JWT
}