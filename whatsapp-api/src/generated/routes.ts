/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SingleController } from './../controllers/SingleController';
import { expressAuthentication } from './../middleware/auth';
// @ts-ignore - no great way to install types from subpackage
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';
const multer = require('multer');


const expressAuthenticationRecasted = expressAuthentication as (req: ExRequest, securityName: string, scopes?: string[], res?: ExResponse) => Promise<any>;


// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
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
    "WAWebJS.MessageTypes.VOICE": {
        "dataType": "refEnum",
        "enums": ["ptt"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "WAWebJS.MessageTypes.DOCUMENT": {
        "dataType": "refEnum",
        "enums": ["document"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "WAWebJS.MessageTypes.STICKER": {
        "dataType": "refEnum",
        "enums": ["sticker"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AllowedMessageTypes": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"WAWebJS.MessageTypes.TEXT"},{"ref":"WAWebJS.MessageTypes.IMAGE"},{"ref":"WAWebJS.MessageTypes.VIDEO"},{"ref":"WAWebJS.MessageTypes.AUDIO"},{"ref":"WAWebJS.MessageTypes.VOICE"},{"ref":"WAWebJS.MessageTypes.DOCUMENT"},{"ref":"WAWebJS.MessageTypes.STICKER"},{"dataType":"enum","enums":["unsupported"]}],"validators":{}},
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
            "chatAvatarUrl": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "unreadCount": {"dataType":"double","required":true},
            "lastMessage": {"dataType":"union","subSchemas":[{"ref":"MessageDto"},{"dataType":"enum","enums":[null]}],"required":true},
            "pinned": {"dataType":"boolean","required":true},
            "timestamp": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ClientStatus": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["initializing"]},{"dataType":"enum","enums":["qr_ready"]},{"dataType":"enum","enums":["ready"]},{"dataType":"enum","enums":["disconnected"]},{"dataType":"enum","enums":["auth_failure"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ClientStateResponse": {
        "dataType": "refObject",
        "properties": {
            "waState": {"dataType":"string","required":true},
            "status": {"ref":"ClientStatus","required":true},
            "qrAvailable": {"dataType":"boolean","required":true},
            "qrDataURL": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "ready": {"dataType":"boolean","required":true},
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

    
        const argsSingleController_getChats: Record<string, TsoaRoute.ParameterSchema> = {
                limit: {"default":50,"in":"query","name":"limit","dataType":"double"},
                offset: {"default":0,"in":"query","name":"offset","dataType":"double"},
                includeArchived: {"default":false,"in":"query","name":"includeArchived","dataType":"boolean"},
        };
        app.get('/single/chats/list',
            authenticateMiddleware([{"basicAuth":[]}]),
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
            authenticateMiddleware([{"basicAuth":[]}]),
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
        const argsSingleController_markAsRead: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                notFoundResponse: {"in":"res","name":"404","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"message":{"dataType":"string","required":true}}},
        };
        app.post('/single/chats/:id/read',
            authenticateMiddleware([{"basicAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SingleController)),
            ...(fetchMiddlewares<RequestHandler>(SingleController.prototype.markAsRead)),

            async function SingleController_markAsRead(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSingleController_markAsRead, request, response });

                const controller = new SingleController();

              await templateService.apiHandler({
                methodName: 'markAsRead',
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
                badRequest: {"in":"res","name":"400","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"error":{"dataType":"string","required":true}}},
        };
        app.get('/single/chats/:id/messages',
            authenticateMiddleware([{"basicAuth":[]}]),
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
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                notFoundResponse: {"in":"res","name":"404","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"message":{"dataType":"string","required":true}}},
                badRequest: {"in":"res","name":"400","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"error":{"dataType":"string","required":true}}},
        };
        app.get('/single/messages/:id/media',
            authenticateMiddleware([{"basicAuth":[]}]),
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
            authenticateMiddleware([{"basicAuth":[]}]),
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
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                contactId: {"in":"path","name":"contactId","required":true,"dataType":"string"},
                notFoundResponse: {"in":"res","name":"404","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"message":{"dataType":"string","required":true}}},
                badGatewayResponse: {"in":"res","name":"502","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"message":{"dataType":"string","required":true}}},
        };
        app.get('/single/avatar/:contactId',
            authenticateMiddleware([{"basicAuth":[]}]),
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
            authenticateMiddleware([{"basicAuth":[]}]),
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
            authenticateMiddleware([{"basicAuth":[]}]),
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
            authenticateMiddleware([{"basicAuth":[]}]),
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
                badRequest: {"in":"res","name":"400","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"error":{"dataType":"string","required":true}}},
                serviceUnavailable: {"in":"res","name":"503","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"retryAfterSeconds":{"dataType":"double","required":true},"error":{"dataType":"string","required":true}}},
        };
        app.get('/single/check',
            authenticateMiddleware([{"basicAuth":[]}]),
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
