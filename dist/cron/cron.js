"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.task = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const node_cron_1 = __importDefault(require("node-cron"));
const task = () => {
    console.log("Running task at:", new Date().toISOString());
    try {
        // Define file paths
        const invoicePath = path_1.default.join(process.cwd(), "data", "invoice.json");
        const archivePath = path_1.default.join(process.cwd(), "data", "archive.json");
        // Read current invoices
        const invoices = JSON.parse((0, fs_1.readFileSync)(invoicePath, "utf-8"));
        console.log(`Total invoices: ${invoices.length}`);
        // Filter paid and pending invoices
        const paidInvoices = invoices.filter((item) => item.status === "paid");
        const pendingInvoices = invoices.filter((item) => item.status !== "paid");
        console.log(`Paid invoices: ${paidInvoices.length}`);
        console.log(`Pending invoices: ${pendingInvoices.length}`);
        // If there are paid invoices, archive them
        if (paidInvoices.length > 0) {
            // Read existing archive or create new array
            let archivedInvoices = [];
            try {
                archivedInvoices = JSON.parse((0, fs_1.readFileSync)(archivePath, "utf-8"));
            }
            catch (error) {
                console.log("No existing archive found, creating new one");
                archivedInvoices = [];
            }
            // Add timestamp to paid invoices
            const newArchivedInvoices = paidInvoices.map((invoice) => ({
                ...invoice,
                archivedAt: new Date().toISOString(),
            }));
            // Append to archive
            archivedInvoices.push(...newArchivedInvoices);
            // Write to archive.json
            (0, fs_1.writeFileSync)(archivePath, JSON.stringify(archivedInvoices, null, 2));
            console.log(`✅ Archived ${paidInvoices.length} paid invoice(s)`);
            // Update invoice.json with only pending invoices
            (0, fs_1.writeFileSync)(invoicePath, JSON.stringify(pendingInvoices, null, 2));
            console.log(`✅ Updated invoice.json with ${pendingInvoices.length} pending invoice(s)`);
        }
        else {
            console.log("No paid invoices to archive");
        }
        console.log("Task completed successfully\n");
    }
    catch (error) {
        console.error("❌ Error in cron task:", error);
    }
};
exports.task = task;
// Schedule the task to run every 10 seconds
// Pattern: "*/10 * * * * *" (every 10 seconds)
// Note: The 6th field (seconds) is supported by node-cron
node_cron_1.default.schedule("* * * * * *", exports.task);
console.log("✅ Cron job scheduled: Running every 10 seconds");
exports.default = node_cron_1.default;
