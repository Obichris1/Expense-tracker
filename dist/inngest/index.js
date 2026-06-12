"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.functions = exports.inngest = void 0;
const inngest_1 = require("inngest");
// Create a client to send and receive events
// export const inngest = new Inngest({ id: "my-app" });
exports.inngest = new inngest_1.Inngest({ id: "expense-tracker" });
const helloWorld = exports.inngest.createFunction({ id: "hello-world", triggers: [{ event: "test/hello.world" }] }, async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s");
    return { message: `Hello ${event.data.email}!` };
});
// Create an empty array where we'll export future Inngest functions
exports.functions = [helloWorld];
