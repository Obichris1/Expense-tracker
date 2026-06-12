import { writeFileSync, readFileSync } from "fs";
import path from "path";
import cron from "node-cron";

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "overdue";
  clientName: string;
  description: string;
  dueDate: string;
  createdAt: string;
}

interface ArchivedInvoice extends Invoice {
  archivedAt: string;
}

export const task = () => {
  console.log("Running task at:", new Date().toISOString());

  try {
    // Define file paths
    const invoicePath = path.join(process.cwd(), "data", "invoice.json");
    const archivePath = path.join(process.cwd(), "data", "archive.json");

    // Read current invoices
    const invoices: Invoice[] = JSON.parse(readFileSync(invoicePath, "utf-8"));
    console.log(`Total invoices: ${invoices.length}`);

    // Filter paid and pending invoices
    const paidInvoices = invoices.filter((item) => item.status === "paid");
    const pendingInvoices = invoices.filter((item) => item.status !== "paid");

    console.log(`Paid invoices: ${paidInvoices.length}`);
    console.log(`Pending invoices: ${pendingInvoices.length}`);

    // If there are paid invoices, archive them
    if (paidInvoices.length > 0) {
      // Read existing archive or create new array
      let archivedInvoices: ArchivedInvoice[] = [];
      try {
        archivedInvoices = JSON.parse(readFileSync(archivePath, "utf-8"));
      } catch (error) {
        console.log("No existing archive found, creating new one");
        archivedInvoices = [];
      }

      // Add timestamp to paid invoices
      const newArchivedInvoices: ArchivedInvoice[] = paidInvoices.map(
        (invoice) => ({
          ...invoice,
          archivedAt: new Date().toISOString(),
        })
      );

      // Append to archive
      archivedInvoices.push(...newArchivedInvoices);

      // Write to archive.json
      writeFileSync(archivePath, JSON.stringify(archivedInvoices, null, 2));
      console.log(`✅ Archived ${paidInvoices.length} paid invoice(s)`);

      // Update invoice.json with only pending invoices
      writeFileSync(invoicePath, JSON.stringify(pendingInvoices, null, 2));
      console.log(`✅ Updated invoice.json with ${pendingInvoices.length} pending invoice(s)`);
    } else {
      console.log("No paid invoices to archive");
    }

    console.log("Task completed successfully\n");
  } catch (error) {
    console.error("❌ Error in cron task:", error);
  }
};

// Schedule the task to run every 10 seconds
// Pattern: "*/10 * * * * *" (every 10 seconds)
// Note: The 6th field (seconds) is supported by node-cron
cron.schedule("* * * * * *", task);

console.log("✅ Cron job scheduled: Running every 10 seconds");

export default cron;