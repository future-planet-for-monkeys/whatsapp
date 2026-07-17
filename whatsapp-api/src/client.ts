import { WhatsappClientFactory, WhatsAppClientWithCache } from "./services/WhatsAppService.v2";
import { Client, WAState } from "whatsapp-web.js";

const options = process.env.CHROMIUM_CDP_URL
    ? { cdpUrl: process.env.CHROMIUM_CDP_URL }
    : undefined;

export class StateError extends Error {
    // add extra properties to the error object
    public state: WAState;
    public methodName: string;
    
    constructor(state: WAState, methodName: string) {
        super(`Cannot call Client.${methodName}: WhatsApp client is ${state}`);
        this.state = state;
        this.methodName = methodName;
    }
}

export const CLIENT: Promise<WhatsAppClientWithCache> =
    WhatsappClientFactory
        .getInstance(options)
        .then(client => withConnectionCheck(client));



function withConnectionCheck(target: WhatsAppClientWithCache): WhatsAppClientWithCache {
    return new Proxy(target, {
        get(target, property, receiver) {
            const value = Reflect.get(target, property, receiver);

            if (typeof value !== "function") {
                return value;
            }

            return async (...args: unknown[]) => {
                const methodName = String(property);

                try {
                    // Avoid checking state before getState itself.
                    if (property !== "getState") {
                        // DIAGNOSTIC: check if pupPage is null before calling getState
                        if (!target['pupPage']) {
                            console.error(`[DIAG] client.ts: target.pupPage is NULL when calling ${methodName}! Target keys:`, Object.keys(target).filter(k => k.startsWith('pup')));
                        }
                        const state = await target.getState();

                        if (state !== WAState.CONNECTED) {
                            throw new StateError(state, methodName);
                        }
                    }

                    return await value.apply(target, args);
                } catch (error) {
                    console.error(`[Client.${methodName}] failed`, error);
                    throw error;
                }
            };
        },
    });
}
