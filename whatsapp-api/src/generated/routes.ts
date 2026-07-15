/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { StatusController } from './../controllers/StatusController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { QrController } from './../controllers/QrController';
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
    "ServiceUnavailableError": {
        "dataType": "refObject",
        "properties": {
            "error": {"dataType":"string","required":true},
            "retryAfterSeconds": {"dataType":"double","required":true},
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
            authenticateMiddleware([{"bearerAuth":[]}]),
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
        const argsQrController_getQr: Record<string, TsoaRoute.ParameterSchema> = {
                format: {"default":"json","in":"query","name":"format","dataType":"union","subSchemas":[{"dataType":"enum","enums":["png"]},{"dataType":"enum","enums":["json"]}]},
                unavailable: {"in":"res","name":"409","required":true,"ref":"QrUnavailableError"},
        };
        app.get('/qr',
            authenticateMiddleware([{"bearerAuth":[]}]),
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
        const argsMessagesController_sendMessage: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"SendMessageBody"},
                badRequest: {"in":"res","name":"400","required":true,"ref":"BadRequestError"},
                serviceUnavailable: {"in":"res","name":"503","required":true,"ref":"ServiceUnavailableError"},
        };
        app.post('/send',
            authenticateMiddleware([{"bearerAuth":[]}]),
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
            authenticateMiddleware([{"bearerAuth":[]}]),
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
            authenticateMiddleware([{"bearerAuth":[]}]),
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
            authenticateMiddleware([{"bearerAuth":[]}]),
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
        const argsChatsController_getChats: Record<string, TsoaRoute.ParameterSchema> = {
                limit: {"default":50,"in":"query","name":"limit","dataType":"double"},
                serviceUnavailable: {"in":"res","name":"503","required":true,"ref":"ServiceUnavailableError"},
        };
        app.get('/chats',
            authenticateMiddleware([{"bearerAuth":[]}]),
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
        };
        app.get('/chats/:chatId/messages',
            authenticateMiddleware([{"bearerAuth":[]}]),
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
