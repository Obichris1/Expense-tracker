import { inngest } from ".";
import { prisma } from "../config/db";
import nodemailer from "nodemailer";


// ✅ Configure email service (adjust based on your email provider)
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);


// ✅ Alternative: Using SendGrid
// import sgMail from "@sendgrid/mail";
// sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// ✅ Helper function to send budget alert email
const sendBudgetAlertEmail = async (
  email: string,
  userName: string,
  budgetName: string,
  budgetAmount: number,
  spentAmount: number,
  percentageSpent: number
) => {
  try {
    const isExceeded = percentageSpent > 100;

    const subject = isExceeded
      ? "⚠️ Budget Exceeded Alert"
      : "⚠️ Budget Warning - Approaching Limit";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }

            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }

            .header {
              background: ${isExceeded ? "#dc2626" : "#ea580c"};
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
            }

            .content {
              background: #f9fafb;
              padding: 20px;
            }

            .button {
              display: inline-block;
              margin-top: 20px;
              background: #2563eb;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
            }

            .footer {
              margin-top: 30px;
              color: #777;
              font-size: 13px;
            }
          </style>
        </head>

        <body>
          <div class="container">

            <div class="header">
              <h2>Budget Alert</h2>
            </div>

            <div class="content">

              <p>Hello ${userName},</p>

              <p>
                Your budget <strong>${budgetName}</strong> has reached
                <strong>${percentageSpent.toFixed(1)}%</strong>.
              </p>

              <p>
                <strong>Budget:</strong>
                ₦${budgetAmount.toLocaleString("en-NG")}
              </p>

              <p>
                <strong>Spent:</strong>
                ₦${spentAmount.toLocaleString("en-NG")}
              </p>

              ${
                isExceeded
                  ? `<p style="color:#dc2626;font-weight:bold;">
                     You have exceeded your budget.
                   </p>`
                  : `<p style="color:#ea580c;font-weight:bold;">
                     You're approaching your budget limit.
                   </p>`
              }

              <a
                class="button"
                href="${process.env.APP_URL}/dashboard"
              >
                Open Dashboard
              </a>

              <div class="footer">
                Expense Tracker
              </div>

            </div>
          </div>
        </body>
      </html>
    `;

    const { error } = await resend.emails.send({
      from: "Expense Tracker <onboarding@resend.dev>",
      to: email,
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error(error);
      return false;
    }

    console.log(`✅ Budget alert sent to ${email}`);

    return true;
  } catch (error) {
    console.error("❌ Failed to send budget alert:", error);
    return false;
  }
};
// ✅ Alternative: SendGrid implementation
// const sendBudgetAlertEmailSendGrid = async (...) => {
//   try {
//     await sgMail.send({
//       to: email,
//       from: process.env.EMAIL_FROM,
//       subject,
//       html: htmlContent,
//     });
//   } catch (error) {
//     console.error("Failed to send email via SendGrid:", error);
//   }
// };

// ✅ Function 1: Cron job to check budgets every hour
const checkBudgetAlerts = inngest.createFunction(
  {
    id: "check-budget-alerts",
    triggers: [
      {
        cron: "*/10 * * * *", // Every hour
      },
    ],
  },
  async ({ event, step }) => {
    console.log("🔍 Starting budget alert check...");

    try {
      // Find all budgets where spending is >= 80% of budget
      const alertBudgets = await step.run("fetch-alert-budgets", async () => {
        const budgets = await prisma.budget.findMany({
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
              },
            },
          },
        });

        console.log(budgets);
        
      
        return budgets
          .map((budget) => ({
            ...budget,
            amount: Number(budget.amount),
            spent: Number(budget.spent),

            lastAlertSent: budget.lastAlertSent?.getTime() ?? null,
          }))
          .filter((budget) => budget.spent >= budget.amount * 0.8);
      });
 
      

      console.log(`📊 Found ${alertBudgets.length} budgets that need alerts`);

      // Send emails for each budget
      const emailResults = await step.run("send-alert-emails", async () => {
        const results = await Promise.all(
          alertBudgets.map(async (budget) => {
            const percentageSpent = (budget.spent / budget.amount) * 100;
            const isExceeded = percentageSpent > 100;

            // Check if we should send alert (max once per day)
            const now = new Date();
            const lastAlertTime = budget.lastAlertSent;
            const shouldSendAlert = true
              // !lastAlertTime || (now.getTime() - lastAlertTime) > 24 * 60 * 60 * 1000;

              console.log(lastAlertTime);
              console.log(shouldSendAlert);
              
              

            if (!shouldSendAlert) {
              console.log(`⏭️  Skipping alert for user ${budget.user.id} - alert sent today`);
              return {
                userId: budget.user.id,
                status: "skipped",
                reason: "alert_sent_today",
              };
            }

            const emailSent = await sendBudgetAlertEmail(
              budget.user.email,
              budget.user.firstName,
              budget.name || "Budget",
              budget.amount,
              budget.spent,
              percentageSpent
            );

            // Update lastAlertSent timestamp
            if (emailSent) {
              await prisma.budget.update({
                where: { id: budget.id },
                data: { lastAlertSent: now },
              });
            }

            return {
              userId: budget.user.id,
              status: emailSent ? "sent" : "failed",
              percentageSpent,
              isExceeded,
            };
          })
        );

        return results;
      });

      const successCount = emailResults.filter((r) => r.status === "sent").length;
      const failedCount = emailResults.filter((r) => r.status === "failed").length;
      const skippedCount = emailResults.filter((r) => r.status === "skipped").length;

      console.log(
        ` Budget alert check completed - Sent: ${successCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`
      );

      return {
        checked: alertBudgets.length,
        sent: successCount,
        failed: failedCount,
        skipped: skippedCount,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("❌ Error in budget alert check:", error);
      throw error;
    }
  }
);

// ✅ Function 2: Event-based budget alert (triggered when transaction is added)
const onTransactionCreated = inngest.createFunction(
  {
    id: "on-transaction-created",
    triggers: [
      {
        event: "transaction/created",
      },
    ],
  },
  async ({ event, step }) => {
    const { userId, type } = event.data;

    console.log(event.data);
    

    // Only process expenses
    if (type !== "expense") {
      return { skipped: true, reason: "income_transaction" };
    }

    try {
      const budgetData = await step.run("fetch-budget", async () => {
        const budget = await prisma.budget.findUnique({
          where: { userId },
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
              },
            },
          },
        });

        if (!budget) return null;

        // ✅ NORMALIZE HERE (critical fix)
        return {
          ...budget,
          amount: Number(budget.amount),
          spent: Number(budget.spent),
          lastAlertSent: budget.lastAlertSent
            ? budget.lastAlertSent.getTime()
            : null,
        };
      });

      if (!budgetData) {
        return { processed: false, reason: "no_budget_set" };
      }

      // ✅ now everything is number-safe
      const percentageSpent =
        (budgetData.spent / budgetData.amount) * 100;

      const isExceeded = percentageSpent > 100;
      const needsAlert = percentageSpent >= 80;

      if (!needsAlert) {
        return {
          processed: true,
          percentageSpent,
          needsAlert: false,
        };
      }

      // ✅ date is now timestamp (number)
      const now = Date.now();

      const shouldSendAlert =true
        // !budgetData.lastAlertSent ||
        // now - budgetData.lastAlertSent > 24 * 60 * 60 * 1000;

console.log(shouldSendAlert);
console.log(budgetData);



      if (!shouldSendAlert) {
        return {
          processed: true,
          percentageSpent,
          needsAlert: true,
          alertSent: false,
          reason: "alert_sent_today",
        };
      }

      const emailSent = await step.run("send-email", async () => {
        return sendBudgetAlertEmail(
          budgetData.user.email,
          budgetData.user.firstName,
          budgetData.name || "Budget",
          budgetData.amount,
          budgetData.spent,
          percentageSpent
        );
      });

      if (emailSent) {
        await step.run("update-alert-timestamp", async () => {
          await prisma.budget.update({
            where: { id: budgetData.id },
            data: { lastAlertSent: new Date() },
          });
        });
      }

      return {
        processed: true,
        percentageSpent,
        needsAlert: true,
        alertSent: emailSent,
        isExceeded,
      };
    } catch (error) {
      console.error("❌ Error in transaction created handler:", error);
      throw error;
    }
  }
);

// ✅ Function 3: Daily digest email (optional - sends summary once per day)
const dailyBudgetDigest = inngest.createFunction(
  {
    id: "daily-budget-digest",
    triggers: [
      {
        cron: "15 15 * * *", // Every day at 8 AM
      },
    ],
  },
  async ({ event, step }) => {
    console.log("📧 Generating daily budget digest...");

    try {
      const budgets = await step.run("fetch-all-budgets", async () => {
        const data = await prisma.budget.findMany({
          include: {
            user: {
              select: {
                id: true, // ✅ FIXED (you use it later)
                email: true,
                firstName: true,
              },
            },
          },
        });

        // ✅ NORMALIZE EVERYTHING HERE
        return data.map((budget) => ({
          ...budget,
          amount: Number(budget.amount),
          spent: Number(budget.spent),
          lastAlertSent: budget.lastAlertSent
            ? budget.lastAlertSent.getTime()
            : null,
        }));
      });

      const digestResults = await step.run("send-digests", async () => {
        return Promise.all(
          budgets.map(async (budget) => {
            const percentageSpent =
              (budget.spent / budget.amount) * 100;

            const remaining = budget.amount - budget.spent;

            const htmlContent = `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 8px; }
                    .content { padding: 20px; background-color: #f9fafb; margin-top: 20px; border-radius: 8px; }
                    .stat { margin: 15px 0; display: flex; justify-content: space-between; }
                    .progress { background-color: #e5e7eb; height: 10px; border-radius: 5px; overflow: hidden; }
                    .progress-fill {
                      height: 100%;
                      background-color: #10b981;
                      width: ${Math.min(percentageSpent, 100)}%;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1 style="margin: 0;">Daily Budget Summary</h1>
                    </div>

                    <div class="content">
                      <p>Hi ${budget.user.firstName},</p>
                      <p>Here's your budget summary for today:</p>

                      <div class="stat">
                        <strong>Budget:</strong>
                        <span>₦${budget.amount.toLocaleString('en-NG')}</span>
                      </div>

                      <div class="stat">
                        <strong>Spent:</strong>
                        <span>₦${budget.spent.toLocaleString('en-NG')}</span>
                      </div>

                      <div class="stat">
                        <strong>Remaining:</strong>
                        <span>₦${remaining.toLocaleString('en-NG')}</span>
                      </div>

                      <div class="progress">
                        <div class="progress-fill"></div>
                      </div>

                      <p style="text-align: center; color: #666;">
                        ${percentageSpent.toFixed(1)}% of budget used
                      </p>
                    </div>
                  </div>
                </body>
              </html>
            `;

            try {
              const { error } = await resend.emails.send({
                from: "Expense Tracker <onboarding@resend.dev>",
                to: budget.user.email,
                subject: "Daily Budget Summary",
                html: htmlContent,
              });
              
              if (error) {
                throw error;
              }

              return {
                userId: budget.user.id,
                status: "sent",
              };
            } catch (error) {
              console.error(
                `Failed to send digest to ${budget.user.email}:`,
                error
              );

              return {
                userId: budget.user.id,
                status: "failed",
              };
            }
          })
        );
      });

      const sent = digestResults.filter(
        (r) => r.status === "sent"
      ).length;

      console.log(
        `✅ Daily budget digest sent to ${sent} users`
      );

      return {
        sent,
        total: budgets.length,
      };
    } catch (error) {
      console.error("❌ Error in daily budget digest:", error);
      throw error;
    }
  }
);

// ✅ Export all functions
export const functions = [checkBudgetAlerts, onTransactionCreated, dailyBudgetDigest];