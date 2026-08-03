# Smart EPP Subvention Prototype

## One-click launch

Double-click `START_SUBVENTION_PROTOTYPE.cmd`.

The launcher starts the local application and opens:

`http://localhost:3000/subvention`

## Demonstration flow

1. Management Overview — use FY, quarter and month filters; open financial drilldowns.
2. Operations Workbench — review transaction outcomes and evidence.
3. Upload Documents — inspect controlled purchase-import handling.
4. Claims & Tracking — prepare counterparty batches and follow lifecycle stages.
5. Master Data — switch to Master Data Admin for governed CRUD and version history.
6. Data Model — inspect the master, evidence and financial hierarchy.

## Demo roles

Use the role control in the top bar to demonstrate maker-checker and segregation:

- Sales Ops Maker
- Business Head Checker
- Master Data Admin
- Finance Billing
- Finance Receipt
- Finance Accounts
- Management Viewer
- Auditor

## Prototype boundary

This build uses an in-memory repository and seeded corporate data. OCR, live LMS, accounting, GST and bank integrations remain adapter-ready but are not connected.

Developed by V L & CO.
