# Ledger — Personal finance dashboard

A responsive personal finance UI for collecting invoices and receipts, entering expense details, tracking spending by category, and exporting CSV.

## Run

Requires Node.js 18 or newer. No package installation is required. Manual entry works without credentials.

```sh
npm start
```

The development server listens on port 3000 (override with `PORT`). Run `npm run check` for JavaScript syntax validation.

## Workflow

Upload PDF, JPG, PNG, or WEBP files up to 10 MB each, then review and enter merchant, amount, date, category, and payment status. Multiple uploads are reviewed in sequence. You can also add expenses without a document. Edit or delete saved expenses, download original documents, search and filter transactions, and export expense metadata as CSV.

Expense records and original documents are stored locally in IndexedDB, scoped to the browser and site origin. Clearing browser data removes them; there is no cloud backup or cross-device sync. CSV export includes metadata, not the original files. Amounts use USD. Bank connections are not implemented. Google Fonts are optional; system fonts work offline.

## AI extraction

Set `FINANCE_AI_KEY` securely in the server environment with an OpenAI API key, then restart `npm start`. `OPENAI_API_KEY` is also supported outside environments that reserve that variable name. Never put a key in browser code or commit it. Allow HTTPS access to `api.openai.com`.

After selecting a document, click **Extract details with AI**. This explicitly sends that document to OpenAI using the Responses API and `gpt-4.1-mini` with structured output and `store: false`. Provider usage charges and data handling apply. Review extracted details before saving; extraction never saves automatically. Non-USD or unknown-currency amounts require manual entry in USD. Missing credentials, provider errors, and unreadable documents leave manual entry available.
