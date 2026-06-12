"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.functions = exports.inngest = void 0;
const inngest_1 = require("inngest");
const db_1 = require("../config/db");
const nodemailer_1 = __importDefault(require("nodemailer"));
// Create a client to send and receive events
exports.inngest = new inngest_1.Inngest({ id: "expense-tracker" });
// ✅ Configure email service (adjust based on your email provider)
const emailTransporter = nodemailer_1.default.createTransport({
    service: "gmail", // or your email service
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use app-specific password for Gmail
    },
});
// ✅ Alternative: Using SendGrid
// import sgMail from "@sendgrid/mail";
// sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
// ✅ Helper function to send budget alert email
const sendBudgetAlertEmail = async (email, userName, budgetName, budgetAmount, spentAmount, percentageSpent) => {
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
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${isExceeded ? '#dc2626' : '#ea580c'}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .alert-box { 
              background-color: ${isExceeded ? '#fee2e2' : '#fed7aa'}; 
              border-left: 4px solid ${isExceeded ? '#dc2626' : '#ea580c'}; 
              padding: 16px; 
              margin: 20px 0; 
              border-radius: 4px;
            }
            .stats { 
              display: flex; 
              justify-content: space-around; 
              margin: 20px 0; 
              flex-wrap: wrap;
            }
            .stat-box { 
              background-color: white; 
              padding: 15px; 
              border-radius: 4px; 
              text-align: center; 
              flex: 1; 
              min-width: 150px; 
              margin: 5px;
            }
            .stat-label { color: #666; font-size: 12px; text-transform: uppercase; }
            .stat-value { font-size: 24px; font-weight: bold; color: #333; margin-top: 5px; }
            .progress-bar { 
              background-color: #e5e7eb; 
              border-radius: 8px; 
              height: 20px; 
              overflow: hidden; 
              margin: 20px 0;
            }
            .progress-fill { 
              height: 100%; 
              background-color: ${percentageSpent > 100 ? '#dc2626' :
            percentageSpent > 80 ? '#ea580c' :
                '#10b981'}; 
              width: ${Math.min(percentageSpent, 100)}%; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              color: white; 
              font-size: 12px; 
              font-weight: bold;
            }
            .button { 
              display: inline-block; 
              background-color: #3b82f6; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 4px; 
              margin: 20px 0;
            }
            .footer { 
              text-align: center; 
              color: #999; 
              font-size: 12px; 
              margin-top: 20px; 
              padding-top: 20px; 
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Budget Alert</h1>
              <p style="margin: 5px 0 0 0;">${isExceeded ? 'Your budget has been exceeded' : 'Your spending is approaching your budget limit'}</p>
            </div>
            
            <div class="content">
              <p>Hi ${userName},</p>
              
              <p>We wanted to let you know about your budget status for <strong>"${budgetName}"</strong>.</p>
              
              <div class="alert-box">
                <strong>${isExceeded ? '🚨 Budget Exceeded!' : '⚠️ Budget Warning'}</strong>
                <p style="margin: 10px 0 0 0;">
                  ${isExceeded
            ? `You have spent ₦${spentAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} out of your budget of ₦${budgetAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}. You are ${(percentageSpent - 100).toFixed(1)}% over budget.`
            : `You have spent ₦${spentAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} out of your budget of ₦${budgetAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}. You are approaching your spending limit.`}
                </p>
              </div>

              <div class="stats">
                <div class="stat-box">
                  <div class="stat-label">Budget Limit</div>
                  <div class="stat-value">₦${budgetAmount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}</div>
                </div>
                <div class="stat-box">
                  <div class="stat-label">Amount Spent</div>
                  <div class="stat-value">₦${spentAmount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}</div>
                </div>
                <div class="stat-box">
                  <div class="stat-label">Percentage Used</div>
                  <div class="stat-value">${percentageSpent.toFixed(1)}%</div>
                </div>
              </div>

              <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min(percentageSpent, 100)}%">
                  ${Math.min(percentageSpent, 100).toFixed(0)}%
                </div>
              </div>

              <p>
                ${isExceeded
            ? 'Consider reviewing your expenses and adjusting your spending to avoid further overspending.'
            : 'You\'re getting close to your budget limit. Consider reviewing your recent expenses.'}
              </p>

              <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" class="button">
                View Dashboard
              </a>

              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>If you need help, visit our support page.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
        // Send email using Nodemailer
        await emailTransporter.sendMail({
            from: process.env.EMAIL_USER,
            to: "obichris202@gmail.com",
            subject,
            html: htmlContent,
        });
        console.log(`✅ Budget alert email sent to ${email}`);
        return true;
    }
    catch (error) {
        console.error("❌ Failed to send budget alert email:", error);
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
const checkBudgetAlerts = exports.inngest.createFunction({
    id: "check-budget-alerts",
    triggers: [
        {
            cron: "0 * * * *", // Every hour
        },
    ],
}, async ({ event, step }) => {
    console.log("🔍 Starting budget alert check...");
    try {
        // Find all budgets where spending is >= 80% of budget
        const alertBudgets = await step.run("fetch-alert-budgets", async () => {
            const budgets = await db_1.prisma.budget.findMany({
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
            const results = await Promise.all(alertBudgets.map(async (budget) => {
                const percentageSpent = (budget.spent / budget.amount) * 100;
                const isExceeded = percentageSpent > 100;
                // Check if we should send alert (max once per day)
                const now = new Date();
                const lastAlertTime = budget.lastAlertSent;
                const shouldSendAlert = true;
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
                const emailSent = await sendBudgetAlertEmail(budget.user.email, budget.user.firstName, budget.name || "Budget", budget.amount, budget.spent, percentageSpent);
                // Update lastAlertSent timestamp
                if (emailSent) {
                    await db_1.prisma.budget.update({
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
            }));
            return results;
        });
        const successCount = emailResults.filter((r) => r.status === "sent").length;
        const failedCount = emailResults.filter((r) => r.status === "failed").length;
        const skippedCount = emailResults.filter((r) => r.status === "skipped").length;
        console.log(`✅ Budget alert check completed - Sent: ${successCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`);
        return {
            checked: alertBudgets.length,
            sent: successCount,
            failed: failedCount,
            skipped: skippedCount,
            timestamp: new Date(),
        };
    }
    catch (error) {
        console.error("❌ Error in budget alert check:", error);
        throw error;
    }
});
// ✅ Function 2: Event-based budget alert (triggered when transaction is added)
const onTransactionCreated = exports.inngest.createFunction({
    id: "on-transaction-created",
    triggers: [
        {
            event: "transaction/created",
        },
    ],
}, async ({ event, step }) => {
    const { userId, type } = event.data;
    console.log(event.data);
    // Only process expenses
    if (type !== "expense") {
        return { skipped: true, reason: "income_transaction" };
    }
    try {
        const budgetData = await step.run("fetch-budget", async () => {
            const budget = await db_1.prisma.budget.findUnique({
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
            if (!budget)
                return null;
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
        const percentageSpent = (budgetData.spent / budgetData.amount) * 100;
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
        const shouldSendAlert = true;
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
            return sendBudgetAlertEmail(budgetData.user.email, budgetData.user.firstName, budgetData.name || "Budget", budgetData.amount, budgetData.spent, percentageSpent);
        });
        if (emailSent) {
            await step.run("update-alert-timestamp", async () => {
                await db_1.prisma.budget.update({
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
    }
    catch (error) {
        console.error("❌ Error in transaction created handler:", error);
        throw error;
    }
});
// ✅ Function 3: Daily digest email (optional - sends summary once per day)
const dailyBudgetDigest = exports.inngest.createFunction({
    id: "daily-budget-digest",
    triggers: [
        {
            cron: "42 8 * * *", // Every day at 8 AM
        },
    ],
}, async ({ event, step }) => {
    console.log("📧 Generating daily budget digest...");
    try {
        const budgets = await step.run("fetch-all-budgets", async () => {
            const data = await db_1.prisma.budget.findMany({
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
            return Promise.all(budgets.map(async (budget) => {
                const percentageSpent = (budget.spent / budget.amount) * 100;
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
                    await emailTransporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: "obichris202@gmail.com",
                        subject: "Daily Budget Summary",
                        html: htmlContent,
                    });
                    return {
                        userId: budget.user.id,
                        status: "sent",
                    };
                }
                catch (error) {
                    console.error(`Failed to send digest to ${budget.user.email}:`, error);
                    return {
                        userId: budget.user.id,
                        status: "failed",
                    };
                }
            }));
        });
        const sent = digestResults.filter((r) => r.status === "sent").length;
        console.log(`✅ Daily budget digest sent to ${sent} users`);
        return {
            sent,
            total: budgets.length,
        };
    }
    catch (error) {
        console.error("❌ Error in daily budget digest:", error);
        throw error;
    }
});
// ✅ Export all functions
exports.functions = [checkBudgetAlerts, onTransactionCreated, dailyBudgetDigest];
//# sourceMappingURL=functions.js.map