// src/utils/tools.ts
import { Type, Tool } from "@google/genai";

export const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "getDashboardSummary",
        description:
          "Retrieve the user's dashboard summary including balances, income, expenses and budget.",
      },

      {
        name: "getTransactions",
        description:
          "Retrieve the user's transactions, optionally filtered by search text or a date range. Results are paginated.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            search: {
              type: Type.STRING,
              description: "Free-text search matched against transaction descriptions.",
            },
            fromDate: {
              type: Type.STRING,
              description: "Start of the date range (inclusive), in ISO 8601 format, e.g. 2026-07-01.",
            },
            toDate: {
              type: Type.STRING,
              description: "End of the date range (inclusive), in ISO 8601 format, e.g. 2026-07-09.",
            },
            page: {
              type: Type.NUMBER,
              description: "Page number to fetch, starting at 1. Defaults to 1.",
            },
            limit: {
              type: Type.NUMBER,
              description: "Number of transactions per page. Defaults to 10.",
            },
          },
        },
      },

      {
        name: "addTransaction",
        description:
          "Create a new income or expense transaction on one of the user's accounts.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            accountId: {
              type: Type.NUMBER,
              description: "ID of the account the transaction belongs to.",
            },
            amount: {
              type: Type.NUMBER,
              description: "Transaction amount as a positive number, in the account's currency.",
            },
            description: {
              type: Type.STRING,
              description: "Short human-readable description, e.g. 'Groceries at Shoprite'.",
            },
            category: {
              type: Type.STRING,
              description: "Spending/income category.",
              // TODO: replace with your Prisma Category enum values:
              enum: [
                "FOOD", "TRANSPORT", "SHOPPING", "BILLS", "ENTERTAINMENT",
                "HEALTH", "EDUCATION", "SALARY", "INVESTMENT", "TRANSFER", "OTHER",
              ],
            },
            source: {
              type: Type.STRING,
              description: "Where the income came from, e.g. 'Salary'. Only relevant for income.",
            },
            type: {
              type: Type.STRING,
              description: "Whether this is an income or an expense.",
              enum: ["income", "expense"],
            },
          },
          required: ["accountId", "amount", "description", "type"],
        },
      },

      {
        name: "getAccounts",
        description:
          "Retrieve all bank/wallet accounts belonging to the user, including names, numbers and current balances. Always call this first if you need an accountId before creating a transaction. This can also give you info of how many accounts the user has",
      },

      {
        name: "createAccount",
        description:
          "Create a new bank or wallet account for the user. Also records an initial deposit transaction automatically.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "Account name, e.g. 'GTB Savings' or 'Cash Wallet'.",
            },
            number: {
              type: Type.STRING,
              description: "Account number or identifier.",
            },
            amount: {
              type: Type.NUMBER,
              description: "Opening balance in the user's currency (NGN). Use 0 if the user hasn't specified.",
            },
          },
          required: ["name", "number", "amount"],
        },
      },

      {
        name: "rememberFact",
        description:
          "Save a durable fact about the user's finances (salary date, recurring bills, budgets, goals) for future conversations. Do not use for one-off transactions.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            content: {
              type: Type.STRING,
              description: "The fact to remember, written as a short standalone statement.",
            },
          },
          required: ["content"],
        },
      },


      {
        name: "getBudget",
        description:
          "Retrieve the user's current budget: name, total amount, amount spent, percentage spent, and remaining. Call this when the user asks about their budget status, how much they have left, or whether they're on track.",
      },
      
      {
        name: "upsertBudget",
        description:
          "Create or update the user's budget. Users only have ONE budget at a time — calling this replaces the existing one if there is any. Use for both 'set a budget of ₦100k' and 'change my budget to ₦150k'.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "Budget name, e.g. 'Monthly budget' or 'August spend'. Optional — defaults to 'My Budget' on create.",
            },
            amount: {
              type: Type.NUMBER,
              description: "Total budget amount in NGN. Must be positive.",
            },
          },
          required: ["amount"],
        },
      },
      
      {
        name: "deleteBudget",
        description:
          "Delete the user's current budget entirely. Only call this when the user explicitly asks to remove, clear, or reset their budget. Do not delete to 'reset' spend — use upsertBudget with a new amount instead.",
      },


    ],
  },
];