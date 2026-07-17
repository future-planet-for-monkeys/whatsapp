/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { StatusController } from './../controllers/StatusController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SingleController } from './../controllers/SingleController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { QrController } from './../controllers/QrController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MessagesReadController } from './../controllers/MessagesReadController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MessagesController } from './../controllers/MessagesController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MediaController } from './../controllers/MediaController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { HealthController } from './../controllers/HealthController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ContactsController } from './../controllers/ContactsController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ChatsController } from './../controllers/ChatsController';
import { expressAuthentication } from './../middleware/auth';
// @ts-ignore - no great way to install types from subpackage
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';
const multer = require('multer');


const expressAuthenticationRecasted = expressAuthentication as (req: ExRequest, securityName: string, scopes?: string[], res?: ExResponse) => Promise<any>;


// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "ClientStatus": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["initializing"]},{"dataType":"enum","enums":["qr_ready"]},{"dataType":"enum","enums":["authenticated"]},{"dataType":"enum","enums":["ready"]},{"dataType":"enum","enums":["disconnected"]},{"dataType":"enum","enums":["auth_failure"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StatusResponse": {
        "dataType": "refObject",
        "properties": {
            "status": {"ref":"ClientStatus","required":true},
            "qrAvailable": {"dataType":"boolean","required":true},
            "ready": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ChatIdDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "server": {"dataType":"string","required":true},
            "user": {"dataType":"string","required":true},
            "_serialized": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MessageIdDto": {
        "dataType": "refObject",
        "properties": {
            "fromMe": {"dataType":"boolean","required":true},
            "remote": {"dataType":"string","required":true},
            "id": {"dataType":"string","required":true},
            "_serialized": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "WAWebJS.MessageTypes.TEXT": {
        "dataType": "refEnum",
        "enums": ["chat"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "WAWebJS.MessageTypes.IMAGE": {
        "dataType": "refEnum",
        "enums": ["image"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "WAWebJS.MessageTypes.VIDEO": {
        "dataType": "refEnum",
        "enums": ["video"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "WAWebJS.MessageTypes.AUDIO": {
        "dataType": "refEnum",
        "enums": ["audio"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "WAWebJS.MessageTypes.DOCUMENT": {
        "dataType": "refEnum",
        "enums": ["document"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AllowedMessageTypes": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"WAWebJS.MessageTypes.TEXT"},{"ref":"WAWebJS.MessageTypes.IMAGE"},{"ref":"WAWebJS.MessageTypes.VIDEO"},{"ref":"WAWebJS.MessageTypes.AUDIO"},{"ref":"WAWebJS.MessageTypes.DOCUMENT"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ContactInfoDto": {
        "dataType": "refObject",
        "properties": {
            "lid": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "pn": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "name": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "avatarUrl": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MessageDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"MessageIdDto","required":true},
            "body": {"dataType":"string","required":true},
            "hasMedia": {"dataType":"boolean","required":true},
            "type": {"ref":"AllowedMessageTypes","required":true},
            "from": {"ref":"ContactInfoDto","required":true},
            "timestamp": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ChatDto": {
        "dataType": "refObject",
        "properties": {
            "archived": {"dataType":"boolean","required":true},
            "id": {"ref":"ChatIdDto","required":true},
            "isGroup": {"dataType":"boolean","required":true},
            "name": {"dataType":"string","required":true},
            "unreadCount": {"dataType":"double","required":true},
            "lastMessage": {"dataType":"union","subSchemas":[{"ref":"MessageDto"},{"dataType":"enum","enums":[null]}],"required":true},
            "pinned": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "QrJsonResponse": {
        "dataType": "refObject",
        "properties": {
            "qr": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "QrUnavailableError": {
        "dataType": "refObject",
        "properties": {
            "error": {"dataType":"string","required":true},
            "retryAfterSeconds": {"dataType":"double"},
            "hint": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "error": {"dataType":"string","required":true},
            "retryAfterSeconds": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ServiceUnavailableError": {
        "dataType": "refObject",
        "properties": {
            "error": {"dataType":"string","required":true},
            "retryAfterSeconds": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MessageSentResponse": {
        "dataType": "refObject",
        "properties": {
            "ok": {"dataType":"enum","enums":[true],"required":true},
            "id": {"dataType":"string","required":true},
            "to": {"dataType":"string","required":true},
            "timestamp": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SendMessageBody": {
        "dataType": "refObject",
        "properties": {
            "to": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BadRequestError": {
        "dataType": "refObject",
        "properties": {
            "error": {"dataType":"string","required":true},
            "retryAfterSeconds": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MediaSentResponse": {
        "dataType": "refObject",
        "properties": {
            "ok": {"dataType":"enum","enums":[true],"required":true},
            "id": {"dataType":"string","required":true},
            "to": {"dataType":"string","required":true},
            "filename": {"dataType":"string","required":true},
            "mimeType": {"dataType":"string","required":true},
            "timestamp": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "HealthResponse": {
        "dataType": "refObject",
        "properties": {
            "ok": {"dataType":"boolean","required":true},
            "whatsapp": {"ref":"ClientStatus","required":true},
            "ts": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ContactItem": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"undefined"}],"required":true},
            "pushname": {"dataType":"string","required":true},
            "shortName": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"undefined"}],"required":true},
            "number": {"dataType":"string","required":true},
            "isGroup": {"dataType":"boolean","required":true},
            "isWAContact": {"dataType":"boolean","required":true},
            "isMyContact": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ContactsResponse": {
        "dataType": "refObject",
        "properties": {
            "count": {"dataType":"double","required":true},
            "contacts": {"dataType":"array","array":{"dataType":"refObject","ref":"ContactItem"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PhoneCheckResult": {
        "dataType": "refObject",
        "properties": {
            "whatsappId": {"dataType":"string","required":true},
            "registered": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PhoneCheckResponse": {
        "dataType": "refObject",
        "properties": {
            "input": {"dataType":"string","required":true},
            "results": {"dataType":"array","array":{"dataType":"refObject","ref":"PhoneCheckResult"},"required":true},
            "registered": {"dataType":"boolean","required":true},
            "whatsappId": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SaveContactResponse": {
        "dataType": "refObject",
        "properties": {
            "ok": {"dataType":"enum","enums":[true],"required":true},
            "id": {"dataType":"string","required":true},
            "phone": {"dataType":"string","required":true},
            "firstName": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SaveContactBody": {
        "dataType": "refObject",
        "properties": {
            "phone": {"dataType":"string","required":true},
            "firstName": {"dataType":"string","required":true},
            "lastName": {"dataType":"string"},
            "syncToAddressbook": {"dataType":"boolean"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LastMessage": {
        "dataType": "refObject",
        "properties": {
            "body": {"dataType":"string","required":true},
            "type": {"dataType":"string","required":true},
            "timestamp": {"dataType":"double","required":true},
            "fromMe": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ChatItem": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "isGroup": {"dataType":"boolean","required":true},
            "phone": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "unreadCount": {"dataType":"double","required":true},
            "timestamp": {"dataType":"double","required":true},
            "lastMessage": {"dataType":"union","subSchemas":[{"ref":"LastMessage"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ChatsResponse": {
        "dataType": "refObject",
        "properties": {
            "count": {"dataType":"double","required":true},
            "chats": {"dataType":"array","array":{"dataType":"refObject","ref":"ChatItem"},"required":true},
            "hasMore": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MessageItem": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "from": {"dataType":"string","required":true},
            "to": {"dataType":"string","required":true},
            "body": {"dataType":"string","required":true},
            "type": {"dataType":"string","required":true},
            "timestamp": {"dataType":"double","required":true},
            "fromMe": {"dataType":"boolean","required":true},
            "hasMedia": {"dataType":"boolean","required":true},
            "author": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "mimeType": {"dataType":"string"},
            "filename": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MessagesResponse": {
        "dataType": "refObject",
        "properties": {
            "chatId": {"dataType":"string","required":true},
            "count": {"dataType":"double","required":true},
            "messages": {"dataType":"array","array":{"dataType":"refObject","ref":"MessageItem"},"required":true},
            "hasMore": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"throw-on-extras","bodyCoercion":true});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa




export function RegisterRoutes(app: Router,opts?:{multer?:ReturnType<typeof multer>}) {

    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################

    const upload = opts?.multer ||  multer({"limits":{"fileSize":8388608}});

    
        const argsStatusController_fetchStatus: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/status',
            authenticateMiddleware([{"bearerAuth":[]},{"basicAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(StatusController)),
            ...(fetchMiddlewares<RequestHandler>(StatusController.prototype.fetchStatus)),

            async function StatusController_fetchStatus(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStatusController_fetchStatus, request, response });

                const controller = new StatusController();

              await templateService.apiHandler({
                methodName: 'fetchStatus',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSingleController_getChats: Record<string, TsoaRoute.ParameterSchema> = {
                limit: {"default":50,"in":"query","name":"limit","dataType":"double"},
                offset: {"default":0,"in":"query","name":"offset","dataType":"double"},
        };
        app.get('/single/chats/all',
            ...(fetchMiddlewares<RequestHandler>(SingleController)),
            ...(fetchMiddlewares<RequestHandler>(SingleController.prototype.getChats)),

            async function SingleController_getChats(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSingleController_getChats, request, response });

                const controller = new SingleController();

              await templateService.apiHandler({
                methodName: 'getChats',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSingleController_getChatById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                notFoundResponse: {"in":"res","name":"404","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"message":{"dataType":"string","required":true}}},
        };
        app.get('/single/chats/:id',
            ...(fetchMiddlewares<RequestHandler>(SingleController)),
            ...(fetchMiddlewares<RequestHandler>(SingleController.prototype.getChatById)),

            async function SingleController_getChatById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSingleController_getChatById, request, response });

                const controller = new SingleController();

              await templateService.apiHandler({
                methodName: 'getChatById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSingleController_getChatMessages: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                limit: {"default":50,"in":"query","name":"limit","dataType":"double"},
                offset: {"default":0,"in":"query","name":"offset","dataType":"double"},
                notFoundResponse: {"in":"res","name":"404","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"message":{"dataType":"string","required":true}}},
        };
        app.get('/single/chats/:id/messages',
            ...(fetchMiddlewares<RequestHandler>(SingleController)),
            ...(fetchMiddlewares<RequestHandler>(SingleController.prototype.getChatMessages)),

            async function SingleController_getChatMessages(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSingleController_getChatMessages, request, response });

                const controller = new SingleController();

              await templateService.apiHandler({
                methodName: 'getChatMessages',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSingleController_downloadMedia: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                notFoundResponse: {"in":"res","name":"404","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"message":{"dataType":"string","required":true}}},
                badRequest: {"in":"res","name":"400","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"error":{"dataType":"string","required":true}}},
        };
        app.get('/single/messages/:id/media',
            ...(fetchMiddlewares<RequestHandler>(SingleController)),
            ...(fetchMiddlewares<RequestHandler>(SingleController.prototype.downloadMedia)),

            async function SingleController_downloadMedia(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSingleController_downloadMedia, request, response });

                const controller = new SingleController();

              await templateService.apiHandler({
                methodName: 'downloadMedia',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSingleController_getClientState: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/single/client/state',
            ...(fetchMiddlewares<RequestHandler>(SingleController)),
            ...(fetchMiddlewares<RequestHandler>(SingleController.prototype.getClientState)),

            async function SingleController_getClientState(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSingleController_getClientState, request, response });

                const controller = new SingleController();

              await templateService.apiHandler({
                methodName: 'getClientState',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSingleController_getAvatar: Record<string, TsoaRoute.ParameterSchema> = {
                contactId: {"in":"path","name":"contactId","required":true,"dataType":"string"},
                notFoundResponse: {"in":"res","name":"404","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"message":{"dataType":"string","required":true}}},
        };
        app.get('/single/avatar/:contactId',
            ...(fetchMiddlewares<RequestHandler>(SingleController)),
            ...(fetchMiddlewares<RequestHandler>(SingleController.prototype.getAvatar)),

            async function SingleController_getAvatar(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSingleController_getAvatar, request, response });

                const controller = new SingleController();

              await templateService.apiHandler({
                methodName: 'getAvatar',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSingleController_getContactInformation: Record<string, TsoaRoute.ParameterSchema> = {
                contactIds: {"in":"body","name":"contactIds","required":true,"dataType":"array","array":{"dataType":"string"}},
                notFoundResponse: {"in":"res","name":"404","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"message":{"dataType":"string","required":true}}},
        };
        app.post('/single/contacts/info',
            ...(fetchMiddlewares<RequestHandler>(SingleController)),
            ...(fetchMiddlewares<RequestHandler>(SingleController.prototype.getContactInformation)),

            async function SingleController_getContactInformation(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSingleController_getContactInformation, request, response });

                const controller = new SingleController();

              await templateService.apiHandler({
                methodName: 'getContactInformation',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSingleController_sendMessage: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"message":{"dataType":"string","required":true},"chatId":{"dataType":"string","required":true}}},
                notFoundResponse: {"in":"res","name":"404","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"message":{"dataType":"string","required":true}}},
        };
        app.post('/single/messages/send-text',
            ...(fetchMiddlewares<RequestHandler>(SingleController)),
            ...(fetchMiddlewares<RequestHandler>(SingleController.prototype.sendMessage)),

            async function SingleController_sendMessage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSingleController_sendMessage, request, response });

                const controller = new SingleController();

              await templateService.apiHandler({
                methodName: 'sendMessage',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSingleController_sendMedia: Record<string, TsoaRoute.ParameterSchema> = {
                chatId: {"in":"path","name":"chatId","required":true,"dataType":"string"},
                file: {"in":"formData","name":"file","required":true,"dataType":"file"},
                notFoundResponse: {"in":"res","name":"404","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"message":{"dataType":"string","required":true}}},
        };
        app.post('/single/messages/:chatId/send-media',
            upload.fields([
                {
                    name: "file",
                    maxCount: 1
                }
            ]),
            ...(fetchMiddlewares<RequestHandler>(SingleController)),
            ...(fetchMiddlewares<RequestHandler>(SingleController.prototype.sendMedia)),

            async function SingleController_sendMedia(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSingleController_sendMedia, request, response });

                const controller = new SingleController();

              await templateService.apiHandler({
                methodName: 'sendMedia',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSingleController_checkPhone: Record<string, TsoaRoute.ParameterSchema> = {
                phone: {"in":"query","name":"phone","required":true,"dataType":"string"},
                notFoundResponse: {"in":"res","name":"404","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"message":{"dataType":"string","required":true}}},
                badRequest: {"in":"res","name":"400","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"error":{"dataType":"string","required":true}}},
                serviceUnavailable: {"in":"res","name":"503","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"retryAfterSeconds":{"dataType":"double","required":true},"error":{"dataType":"string","required":true}}},
        };
        app.get('/single/check',
            ...(fetchMiddlewares<RequestHandler>(SingleController)),
            ...(fetchMiddlewares<RequestHandler>(SingleController.prototype.checkPhone)),

            async function SingleController_checkPhone(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSingleController_checkPhone, request, response });

                const controller = new SingleController();

              await templateService.apiHandler({
                methodName: 'checkPhone',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsQrController_getQr: Record<string, TsoaRoute.ParameterSchema> = {
                format: {"default":"json","in":"query","name":"format","dataType":"union","subSchemas":[{"dataType":"enum","enums":["png"]},{"dataType":"enum","enums":["json"]}]},
                unavailable: {"in":"res","name":"409","required":true,"ref":"QrUnavailableError"},
        };
        app.get('/qr',
            authenticateMiddleware([{"bearerAuth":[]},{"basicAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(QrController)),
            ...(fetchMiddlewares<RequestHandler>(QrController.prototype.getQr)),

            async function QrController_getQr(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsQrController_getQr, request, response });

                const controller = new QrController();

              await templateService.apiHandler({
                methodName: 'getQr',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMessagesReadController_getMedia: Record<string, TsoaRoute.ParameterSchema> = {
                messageId: {"in":"path","name":"messageId","required":true,"dataType":"string"},
                notFound: {"in":"res","name":"404","required":true,"ref":"ErrorResponse"},
                serviceUnavailable: {"in":"res","name":"503","required":true,"ref":"ServiceUnavailableError"},
        };
        app.get('/messages/:messageId/media',
            authenticateMiddleware([{"bearerAuth":[]},{"basicAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MessagesReadController)),
            ...(fetchMiddlewares<RequestHandler>(MessagesReadController.prototype.getMedia)),

            async function MessagesReadController_getMedia(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMessagesReadController_getMedia, request, response });

                const controller = new MessagesReadController();

              await templateService.apiHandler({
                methodName: 'getMedia',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMessagesController_sendMessage: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"SendMessageBody"},
                badRequest: {"in":"res","name":"400","required":true,"ref":"BadRequestError"},
                serviceUnavailable: {"in":"res","name":"503","required":true,"ref":"ServiceUnavailableError"},
        };
        app.post('/send',
            authenticateMiddleware([{"bearerAuth":[]},{"basicAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MessagesController)),
            ...(fetchMiddlewares<RequestHandler>(MessagesController.prototype.sendMessage)),

            async function MessagesController_sendMessage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMessagesController_sendMessage, request, response });

                const controller = new MessagesController();

              await templateService.apiHandler({
                methodName: 'sendMessage',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMediaController_sendMedia: Record<string, TsoaRoute.ParameterSchema> = {
                to: {"in":"formData","name":"to","required":true,"dataType":"string"},
                file: {"in":"formData","name":"file","required":true,"dataType":"file"},
                badRequest: {"in":"res","name":"400","required":true,"ref":"BadRequestError"},
                serviceUnavailable: {"in":"res","name":"503","required":true,"ref":"ServiceUnavailableError"},
                caption: {"in":"formData","name":"caption","dataType":"string"},
        };
        app.post('/send-media',
            authenticateMiddleware([{"bearerAuth":[]},{"basicAuth":[]}]),
            upload.fields([
                {
                    name: "file",
                    maxCount: 1
                }
            ]),
            ...(fetchMiddlewares<RequestHandler>(MediaController)),
            ...(fetchMiddlewares<RequestHandler>(MediaController.prototype.sendMedia)),

            async function MediaController_sendMedia(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMediaController_sendMedia, request, response });

                const controller = new MediaController();

              await templateService.apiHandler({
                methodName: 'sendMedia',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsHealthController_getHealth: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/health',
            ...(fetchMiddlewares<RequestHandler>(HealthController)),
            ...(fetchMiddlewares<RequestHandler>(HealthController.prototype.getHealth)),

            async function HealthController_getHealth(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsHealthController_getHealth, request, response });

                const controller = new HealthController();

              await templateService.apiHandler({
                methodName: 'getHealth',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsContactsController_getContacts: Record<string, TsoaRoute.ParameterSchema> = {
                limit: {"default":200,"in":"query","name":"limit","dataType":"double"},
                serviceUnavailable: {"in":"res","name":"503","required":true,"ref":"ServiceUnavailableError"},
        };
        app.get('/contacts',
            authenticateMiddleware([{"bearerAuth":[]},{"basicAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ContactsController)),
            ...(fetchMiddlewares<RequestHandler>(ContactsController.prototype.getContacts)),

            async function ContactsController_getContacts(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsContactsController_getContacts, request, response });

                const controller = new ContactsController();

              await templateService.apiHandler({
                methodName: 'getContacts',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsContactsController_checkPhone: Record<string, TsoaRoute.ParameterSchema> = {
                phone: {"in":"query","name":"phone","required":true,"dataType":"string"},
                badRequest: {"in":"res","name":"400","required":true,"ref":"BadRequestError"},
                serviceUnavailable: {"in":"res","name":"503","required":true,"ref":"ServiceUnavailableError"},
        };
        app.get('/contacts/check',
            authenticateMiddleware([{"bearerAuth":[]},{"basicAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ContactsController)),
            ...(fetchMiddlewares<RequestHandler>(ContactsController.prototype.checkPhone)),

            async function ContactsController_checkPhone(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsContactsController_checkPhone, request, response });

                const controller = new ContactsController();

              await templateService.apiHandler({
                methodName: 'checkPhone',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsContactsController_saveContact: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"SaveContactBody"},
                badRequest: {"in":"res","name":"400","required":true,"ref":"BadRequestError"},
                serviceUnavailable: {"in":"res","name":"503","required":true,"ref":"ServiceUnavailableError"},
        };
        app.post('/contacts',
            authenticateMiddleware([{"bearerAuth":[]},{"basicAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ContactsController)),
            ...(fetchMiddlewares<RequestHandler>(ContactsController.prototype.saveContact)),

            async function ContactsController_saveContact(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsContactsController_saveContact, request, response });

                const controller = new ContactsController();

              await templateService.apiHandler({
                methodName: 'saveContact',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsContactsController_getAvatar: Record<string, TsoaRoute.ParameterSchema> = {
                contactId: {"in":"path","name":"contactId","required":true,"dataType":"string"},
                notFound: {"in":"res","name":"404","required":true,"ref":"ErrorResponse"},
                serviceUnavailable: {"in":"res","name":"503","required":true,"ref":"ServiceUnavailableError"},
        };
        app.get('/contacts/:contactId/avatar',
            authenticateMiddleware([{"bearerAuth":[]},{"basicAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ContactsController)),
            ...(fetchMiddlewares<RequestHandler>(ContactsController.prototype.getAvatar)),

            async function ContactsController_getAvatar(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsContactsController_getAvatar, request, response });

                const controller = new ContactsController();

              await templateService.apiHandler({
                methodName: 'getAvatar',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsChatsController_getChats: Record<string, TsoaRoute.ParameterSchema> = {
                limit: {"default":50,"in":"query","name":"limit","dataType":"double"},
                offset: {"default":0,"in":"query","name":"offset","dataType":"double"},
                serviceUnavailable: {"in":"res","name":"503","required":true,"ref":"ServiceUnavailableError"},
        };
        app.get('/chats',
            authenticateMiddleware([{"bearerAuth":[]},{"basicAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ChatsController)),
            ...(fetchMiddlewares<RequestHandler>(ChatsController.prototype.getChats)),

            async function ChatsController_getChats(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsChatsController_getChats, request, response });

                const controller = new ChatsController();

              await templateService.apiHandler({
                methodName: 'getChats',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsChatsController_getChatMessages: Record<string, TsoaRoute.ParameterSchema> = {
                chatId: {"in":"path","name":"chatId","required":true,"dataType":"string"},
                limit: {"default":50,"in":"query","name":"limit","dataType":"double"},
                serviceUnavailable: {"in":"res","name":"503","required":true,"ref":"ServiceUnavailableError"},
                before: {"in":"query","name":"before","dataType":"double"},
        };
        app.get('/chats/:chatId/messages',
            authenticateMiddleware([{"bearerAuth":[]},{"basicAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ChatsController)),
            ...(fetchMiddlewares<RequestHandler>(ChatsController.prototype.getChatMessages)),

            async function ChatsController_getChatMessages(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsChatsController_getChatMessages, request, response });

                const controller = new ChatsController();

              await templateService.apiHandler({
                methodName: 'getChatMessages',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsChatsController_markChatRead: Record<string, TsoaRoute.ParameterSchema> = {
                chatId: {"in":"path","name":"chatId","required":true,"dataType":"string"},
                serviceUnavailable: {"in":"res","name":"503","required":true,"ref":"ServiceUnavailableError"},
                notFound: {"in":"res","name":"404","required":true,"ref":"ErrorResponse"},
        };
        app.post('/chats/:chatId/read',
            authenticateMiddleware([{"bearerAuth":[]},{"basicAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ChatsController)),
            ...(fetchMiddlewares<RequestHandler>(ChatsController.prototype.markChatRead)),

            async function ChatsController_markChatRead(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsChatsController_markChatRead, request, response });

                const controller = new ChatsController();

              await templateService.apiHandler({
                methodName: 'markChatRead',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function authenticateMiddleware(security: TsoaRoute.Security[] = []) {
        return async function runAuthenticationMiddleware(request: any, response: any, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            // keep track of failed auth attempts so we can hand back the most
            // recent one.  This behavior was previously existing so preserving it
            // here
            const failedAttempts: any[] = [];
            const pushAndRethrow = (error: any) => {
                failedAttempts.push(error);
                throw error;
            };

            const secMethodOrPromises: Promise<any>[] = [];
            for (const secMethod of security) {
                if (Object.keys(secMethod).length > 1) {
                    const secMethodAndPromises: Promise<any>[] = [];

                    for (const name in secMethod) {
                        secMethodAndPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }

                    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

                    secMethodOrPromises.push(Promise.all(secMethodAndPromises)
                        .then(users => { return users[0]; }));
                } else {
                    for (const name in secMethod) {
                        secMethodOrPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }
                }
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            try {
                request['user'] = await Promise.any(secMethodOrPromises);

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }

                next();
            }
            catch(err) {
                // Show most recent error as response
                const error = failedAttempts.pop();
                error.status = error.status || 401;

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }
                next(error);
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        }
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
