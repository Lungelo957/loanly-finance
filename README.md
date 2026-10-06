# CashFlow Central

CASHFLOW — FULL SAAS APPLICATION BUILD SPECIFICATION

Build a complete, production-focused multi-tenant SaaS web application called:

CashFlow

CashFlow is a Loan Management and Financial Management SaaS platform designed for businesses that lend money and need to manage:

Capital

Borrowers

Loans

Interest

Repayment schedules

Payments

Collections

Expenses

Financial performance

Business reports

The application must be built as a REAL working SaaS application.

This must NOT be a demo application.

Do NOT use fake data, mock data, hardcoded borrowers, hardcoded loans, or simulated backend responses.

Supabase must be the single source of truth.

Every important record must persist in the Supabase database and must be available after:

Page refresh

Logout/login

Browser restart

Login from another device

━━━━━━━━━━━━━━━━━━━━━━━━━━

1. TECHNOLOGY

Build using:

React

TypeScript

Modern responsive frontend

Supabase

Supabase Authentication

Supabase PostgreSQL

Supabase Row Level Security

Supabase Storage where needed

Clean component architecture

Use Lovable's recommended architecture where appropriate.

IMPORTANT:

Do not expose:

Supabase service role keys

Database secrets

Sensitive environment variables

The frontend must use the appropriate public Supabase configuration only.

Privileged operations must be handled securely.

━━━━━━━━━━━━━━━━━━━━━━━━━━

2. MULTI-TENANT SAAS ARCHITECTURE

CashFlow is a multi-tenant SaaS application.

Each business is a separate tenant.

Example:

Business A

Must only access:

Its borrowers

Its loans

Its payments

Its expenses

Its reports

Its support tickets

Business B must NEVER see Business A's data.

Use ONE clear and consistent database architecture.

Do NOT create competing concepts unnecessarily.

Do not create multiple overlapping structures such as:

businesses

tenants

organizations

workspaces

unless absolutely necessary.

Choose ONE canonical tenant entity.

Recommended concept:

businesses

Every business-related record must use:

business_id

Examples:

borrowers.business_id
loans.business_id
payments.business_id
expenses.business_id
support_tickets.business_id

There must be one consistent source of truth.

━━━━━━━━━━━━━━━━━━━━━━━━━━

3. USER ROLES

Implement clear roles.

SYSTEM ADMIN

System Admin manages the CashFlow platform.

System Admin can:

Access Admin Portal

View all businesses

View pending businesses

Approve businesses

Reject businesses

Activate businesses

Deactivate businesses

View platform statistics

Manage support tickets

Manage platform settings

System Admin must not use the Business Portal as their primary portal.

━━━━━━━━━━━━━━━━━━━━━━━━━━

BUSINESS OWNER

Business Owner:

Registers their business

Owns the business workspace

Manages business financial data

Manages borrowers

Creates loans

Records payments

Records expenses

Views reports

Creates support tickets

Business Owners must only access their own business.

━━━━━━━━━━━━━━━━━━━━━━━━━━

4. SEPARATE PORTALS

The application must have two completely separate portals.

ADMIN PORTAL

Route:

/admin

Admin login page:

/admin/login

Admin dashboard:

/admin/dashboard

Admin users must only access Admin functionality.

━━━━━━━━━━━━━━━━━━━━━━━━━━

BUSINESS PORTAL

Route:

/business

Business login:

/business/login

Business registration:

/business/register

Business dashboard:

/business/dashboard

Business users must NOT access Admin functionality.

━━━━━━━━━━━━━━━━━━━━━━━━━━

5. AUTHENTICATION

Use real Supabase Authentication.

Implement:

Registration

Login

Logout

Email confirmation

Password creation

Password reset

Session restoration

Protected routes

IMPORTANT:

Users must confirm their email before accessing the system.

Do not allow unconfirmed accounts to access protected application functionality.

━━━━━━━━━━━━━━━━━━━━━━━━━━

6. BUSINESS REGISTRATION AND APPROVAL

The registration workflow must be secure and backend-driven.

Business registration process:

STEP 1:

User visits:

/business/register

STEP 2:

User enters:

Full Name

Business Name

Email Address

Password

Confirm Password

Business Location

STEP 3:

Create the user using Supabase Authentication.

STEP 4:

Create a business record.

Initial status:

pending

Example:

business.status = pending

STEP 5:

Create the relationship between:

authenticated user
↓
business

STEP 6:

User confirms their email.

STEP 7:

After login, the user is informed:

"Your business registration is pending administrator approval."

STEP 8:

The business must NOT access the business workspace yet.

━━━━━━━━━━━━━━━━━━━━━━━━━━

7. BUSINESS APPROVAL

Admin logs in through:

/admin

Admin can see:

Pending Businesses

Admin can:

View business details

Approve

Reject

Activate

Deactivate

When Admin approves a business:

The REAL Supabase database must update.

Example:

pending

→

approved

→

active

Do NOT only update the frontend UI.

The database must be the source of truth.

After approval:

Business owner can:

Login

Access Business Dashboard

Use Business features

━━━━━━━━━━━━━━━━━━━━━━━━━━

8. BUSINESS STATUS

Use a clear lifecycle.

Recommended:

pending
approved
active
suspended
rejected

Define exactly how each status behaves.

pending

Cannot access workspace.

approved/active

Can access workspace.

suspended

Cannot access workspace.

rejected

Cannot access workspace.

Status must be checked against the backend/database.

Do NOT rely only on React state.

━━━━━━━━━━━━━━━━━━━━━━━━━━

9. DATABASE ARCHITECTURE

Create a clean production-ready Supabase schema.

Recommended tables:

profiles

businesses

business_members

borrowers

loans

loan_repayments

payments

expenses

support_tickets

notifications

activity_logs

Use additional tables only when necessary.

━━━━━━━━━━━━━━━━━━━━━━━━━━

10. PROFILES

Create a profile for authenticated users.

Possible fields:

id

full_name

email

role

created_at

updated_at

The profile ID should be associated with:

auth.users.id

━━━━━━━━━━━━━━━━━━━━━━━━━━

11. BUSINESSES

Businesses table should contain appropriate fields such as:

id

name

owner_id

location

status

package

created_at

updated_at

The business ID must be the canonical tenant identifier.

━━━━━━━━━━━━━━━━━━━━━━━━━━

12. BUSINESS MEMBERS

Create a secure relationship between users and businesses.

Fields may include:

id

business_id

user_id

role

created_at

A Business Owner should be associated with the correct business.

This relationship must be used when determining access.

━━━━━━━━━━━━━━━━━━━━━━━━━━

13. ROW LEVEL SECURITY

Enable RLS.

This is critical.

Business users must ONLY access records belonging to their business.

Examples:

Business A:

SELECT borrowers
WHERE business_id = Business A

Business B:

SELECT borrowers
WHERE business_id = Business B

Do not allow frontend users to manually change a business_id and access another business.

RLS must enforce tenant isolation.

Apply RLS policies to:

businesses

business_members

borrowers

loans

loan_repayments

payments

expenses

support_tickets

notifications

Use secure policies.

Do NOT disable RLS as a shortcut.

Do NOT create public access policies.

━━━━━━━━━━━━━━━━━━━━━━━━━━

14. SYSTEM ADMIN SECURITY

System Admin permissions must be secure.

Business users must not gain Admin access by:

Changing a URL

Changing frontend state

Manipulating localStorage

Editing browser requests

Admin authorization must be verified using backend/database role information.

Do not store privileged authorization solely in localStorage.

━━━━━━━━━━━━━━━━━━━━━━━━━━

15. BUSINESS DASHBOARD

Route:

/business/dashboard

Dashboard must use REAL Supabase data.

No fake statistics.

Show:

Key Financial Indicators

Total Capital

Available Capital

Capital Deployed

Outstanding Loan Balance

Total Collected

Total Expenses

Net Cash Flow

Active Borrowers

Active Loans

Overdue Loans

All values must be calculated from real database records.

When no records exist:

Show:

0

or a proper empty state.

Never show fake numbers.

━━━━━━━━━━━━━━━━━━━━━━━━━━

16. BUSINESS CAPITAL

Create a Capital Management module.

Business Owner can:

Set initial capital

Record additional capital

View capital history

View available capital

Capital data must persist in Supabase.

Financial calculations must use real data.

Do not only store capital in frontend state.

━━━━━━━━━━━━━━━━━━━━━━━━━━

17. BORROWERS

Create a complete Borrowers module.

Route:

/business/borrowers

Business users can:

Add borrower

View borrower

Edit borrower

Search borrower

Delete borrower where appropriate

Borrower information can include:

Full Name

Phone Number

Email

Address

Identification Number

Employment Information

Monthly Income

Notes

Every borrower must contain:

business_id

When creating a borrower:

Frontend
↓
Validate
↓
Authenticated user
↓
Resolve authorized business
↓
Supabase INSERT
↓
Check database response
↓
Return saved borrower
↓
Refresh/re-fetch from Supabase

IMPORTANT:

A borrower must actually exist in Supabase.

After:

Refresh

Logout/login

Another device

The borrower must still appear.

━━━━━━━━━━━━━━━━━━━━━━━━━━

18. BORROWER DATA FETCHING

Borrowers page must load data correctly.

Correct flow:

Application loads
↓
Supabase session restored
↓
Authenticated user resolved
↓
Business membership resolved
↓
Authorized business_id obtained
↓
SELECT borrowers
WHERE business_id = authorized business
↓
Display borrowers

Do not run the query before the business ID is available.

Do not use arbitrary timeouts.

Handle:

Loading

Empty state

Error state

Successful data

━━━━━━━━━━━━━━━━━━━━━━━━━━

19. LOANS

Create a complete Loan Management module.

Route:

/business/loans

Business user can:

Create loan

Select borrower

Set principal amount

Set interest rate

Set loan term

Select repayment frequency

Select start date

Generate repayment schedule

View loan

View borrower loans

Edit permitted information

Update loan status

Loan fields should include:

id

business_id

borrower_id

principal_amount

interest_rate

loan_term

repayment_frequency

start_date

status

created_at

━━━━━━━━━━━━━━━━━━━━━━━━━━

20. LOAN CALCULATIONS

Use real consistent calculations.

Do not hardcode results.

Clearly define:

Principal

Interest

Total repayment

Installment amount

Outstanding balance

Use a consistent calculation model.

Ensure calculations are accurate.

━━━━━━━━━━━━━━━━━━━━━━━━━━

21. LOAN REPAYMENT SCHEDULES

Generate repayment schedules.

Store repayment schedule records in Supabase.

Table:

loan_repayments

Example fields:

id

loan_id

business_id

due_date

amount_due

amount_paid

status

paid_date

Every schedule must belong to:

loan
and
business

━━━━━━━━━━━━━━━━━━━━━━━━━━

22. PAYMENTS

Route:

/business/payments

Business users can:

Record payment

Select loan

Enter amount

Enter payment date

Add payment reference

Add notes

Payment must:

Save to Supabase.

Be associated with correct business.

Be associated with correct loan.

Update relevant loan repayment data.

Update outstanding balance calculations.

Never pretend a payment succeeded if Supabase failed.

━━━━━━━━━━━━━━━━━━━━━━━━━━

23. COLLECTIONS

Create a Collections module.

Route:

/business/collections

Show real:

Due payments

Overdue payments

Upcoming payments

Collected payments

Data must come from:

loans
loan_repayments
payments

Do not use fake collection data.

━━━━━━━━━━━━━━━━━━━━━━━━━━

24. EXPENSES

Route:

/business/expenses

Business user can:

Add expense

Edit expense

Delete expense

Select category

Enter amount

Select date

Add description

Expense must save to Supabase.

Every expense must contain:

business_id

━━━━━━━━━━━━━━━━━━━━━━━━━━

25. REPORTS

Route:

/business/reports

Create reports based on REAL database data.

Include:

Loan Report

Borrower Report

Payment Report

Collections Report

Expense Report

Financial Summary

Do not generate fake reports.

━━━━━━━━━━━━━━━━━━━━━━━━━━

26. AGREEMENTS

Create an Agreements module.

Route:

/business/agreements

Allow agreements to be associated with:

Borrowers

Loans

Support agreement generation/storage where appropriate.

Do not create fake agreements.

━━━━━━━━━━━━━━━━━━━━━━━━━━

27. ADMIN DASHBOARD

Route:

/admin/dashboard

Use real Supabase data.

Show:

Total Businesses

Pending Businesses

Active Businesses

Suspended Businesses

Total Borrowers

Total Loans

Total Support Tickets

All statistics must come from the real database.

━━━━━━━━━━━━━━━━━━━━━━━━━━

28. BUSINESS MANAGEMENT

Route:

/admin/businesses

Admin can:

View businesses

Search businesses

Filter businesses

View pending businesses

Approve business

Reject business

Activate business

Suspend business

View business details

All actions must persist in Supabase.

After refresh, the updated status must remain.

━━━━━━━━━━━━━━━━━━━━━━━━━━

29. SUPPORT SYSTEM

Business Portal must have:

Support

Business users can create support tickets.

Ticket fields:

id

business_id

user_id

subject

message

status

created_at

━━━━━━━━━━━━━━━━━━━━━━━━━━

30. ADMIN SUPPORT QUEUE

Admin Portal must have:

/admin/support

Admin can:

View tickets

Search tickets

Filter tickets

Open tickets

Change ticket status

Resolve tickets

Delete tickets

IMPORTANT:

When Admin deletes a ticket:

Supabase DELETE
↓
Database record removed
↓
UI updates

After refresh:

The ticket must NOT return.

━━━━━━━━━━━━━━━━━━━━━━━━━━

31. NOTIFICATIONS

Implement useful notifications.

Examples:

Business:

Business approved

Business suspended

Loan created

Payment recorded

Support ticket updated

Admin:

New business registration

New support ticket

Use real backend data where possible.

━━━━━━━━━━━━━━━━━━━━━━━━━━

32. LOGOUT

Logout must:

Sign out of Supabase.

Clear authenticated session appropriately.

Redirect user to the correct login page.

After logout:

Protected pages must not be accessible.

━━━━━━━━━━━━━━━━━━━━━━━━━━

33. LOGIN SESSION

When a user logs in:

The application must:

Restore Supabase session.

Get authenticated user.

Load profile.

Resolve role.

Resolve business membership.

Check business status.

Redirect to correct portal.

Do not fetch business data before authentication and business context are ready.

Correct sequence:

Loading
↓
Session
↓
User
↓
Profile
↓
Business Membership
↓
Business Status
↓
Fetch Business Data
↓
Render Application

━━━━━━━━━━━━━━━━━━━━━━━━━━

34. DATA PERSISTENCE REQUIREMENT

This is extremely important.

The following data MUST persist in Supabase:

Businesses

Business memberships

Capital

Borrowers

Loans

Repayment schedules

Payments

Expenses

Support tickets

Notifications

The frontend must NOT use:

localStorage

sessionStorage

mock arrays

as a permanent database.

localStorage may only be used for harmless UI preferences such as:

Theme

Sidebar state

━━━━━━━━━━━━━━━━━━━━━━━━━━

35. REMOVE FAKE DATA

Do not include:

Demo borrowers

Sample loans

Fake payments

Fake statistics

Hardcoded financial numbers

When the database is empty:

Show professional empty states.

Example:

"No borrowers yet"

"Add your first borrower to get started."

━━━━━━━━━━━━━━━━━━━━━━━━━━

36. UI DESIGN

Create a beautiful professional SaaS/Fintech design.

CashFlow branding:

Style:

Modern

Premium

Professional

Trustworthy

Clean

Simple

Not confusing

Color direction:

Light cream / white background

Deep navy text

Gold accent

Matching neutral colors

Use:

Modern cards

Soft shadows

Rounded corners

Professional typography

Consistent spacing

Clean icons

Minimal clutter

Do not make it overly colorful.

━━━━━━━━━━━━━━━━━━━━━━━━━━

37. AUTHENTICATION UI

Create beautiful authentication pages.

Business authentication:

/business/login

/business/register

Admin authentication:

/admin/login

Requirements:

Clean

Simple

Easy to understand

Mobile friendly

Professional fintech appearance

Do not show the application sidebar or dashboard navigation before authentication.

━━━━━━━━━━━━━━━━━━━━━━━━━━

38. MOBILE RESPONSIVENESS

The entire application must be mobile-friendly.

Test:

Mobile

Tablet

Desktop

On mobile:

Navigation must work.

Menu buttons must not disappear.

Forms must fit screen.

Tables must remain usable.

Important buttons must remain accessible.

No horizontal page overflow.

Do not create a black empty area or horizontal overflow.

━━━━━━━━━━━━━━━━━━━━━━━━━━

39. DASHBOARD MOBILE DESIGN

The Key Financial Indicators must remain compact.

Do not create an extremely long vertical page.

Use:

Compact grid

Horizontal layout where appropriate

Responsive cards

Keep mobile dashboard professional.

━━━━━━━━━━━━━━━━━━━━━━━━━━

40. LOADING STATES

Every Supabase operation must have appropriate loading states.

Examples:

Loading borrowers...

Saving borrower...

Creating loan...

Loading dashboard...

Do not leave users confused.

━━━━━━━━━━━━━━━━━━━━━━━━━━

41. EMPTY STATES

Implement professional empty states.

Examples:

No borrowers

No loans

No payments

No expenses

No support tickets

Do not show broken tables.

━━━━━━━━━━━━━━━━━━━━━━━━━━

42. ERROR HANDLING

Every important operation must handle errors.

Examples:

Network errors

Authentication errors

RLS errors

Database errors

Validation errors

Show clear user-friendly messages.

Do not expose database internals unnecessarily.

━━━━━━━━━━━━━━━━━━━━━━━━━━

43. FORM VALIDATION

Validate:

Required fields

Email

Passwords

Numbers

Currency

Dates

Loan values

Do not allow invalid financial data.

━━━━━━━━━━━━━━━━━━━━━━━━━━

44. PWA

Make CashFlow installable as a Progressive Web Application.

Include:

Web App Manifest

Service Worker

Install functionality

Install prompt where supported

Offline handling appropriate for the application

Use proper CashFlow icons.

Include:

16x16

32x32

180x180

192x192

512x512

Use:

Favicon

App icons

PWA icons

━━━━━━━━━━━━━━━━━━━━━━━━━━

45. PWA INSTALL PROMPT

When supported, show a professional install suggestion.

Example:

"Install CashFlow"

"Install CashFlow on your phone or computer for quick access."

Buttons:

Install

Not now

The Install button must actually trigger the PWA installation process where browser support exists.

Do not create a fake install button.

━━━━━━━━━━━━━━━━━━━━━━━━━━

46. PROTECTED ROUTES

Unauthenticated users cannot access:

/business/dashboard

/admin/dashboard

or other protected pages.

Pending businesses cannot access the business workspace.

Suspended businesses cannot access the business workspace.

Business users cannot access admin routes.

Admin users must have appropriate authorization.

━━━━━━━━━━━━━━━━━━━━━━━━━━

47. SECURITY REQUIREMENTS

Do NOT expose:

Service role key

Database secrets

Admin secrets

Use:

Supabase RLS

Secure authorization

Authenticated database operations

Proper tenant isolation

Never trust frontend authorization alone.

━━━━━━━━━━━━━━━━━━━━━━━━━━

48. DATA FLOW REQUIREMENT

Every module must follow this pattern:

USER ACTION
↓
FORM VALIDATION
↓
AUTHENTICATED USER
↓
AUTHORIZED BUSINESS ID
↓
SUPABASE OPERATION
↓
CHECK RESPONSE
↓
REFETCH/UPDATE FROM DATABASE
↓
UI DISPLAY

Do not fake successful operations.

━━━━━━━━━━━━━━━━━━━━━━━━━━

49. TESTING REQUIREMENTS

Test every important operation.

BUSINESS REGISTRATION:

Register
↓
Supabase user
↓
Business created
↓
Status pending
↓
Admin sees business

BUSINESS APPROVAL:

Admin approves
↓
Database updates
↓
Status persists
↓
Business can access workspace

BORROWER:

Create
↓
Supabase INSERT
↓
Refresh
↓
Borrower appears

Logout
↓
Login
↓
Borrower appears

Another device
↓
Login
↓
Borrower appears

LOAN:

Create
↓
Supabase INSERT
↓
Refresh
↓
Loan appears

PAYMENT:

Record
↓
Supabase INSERT
↓
Refresh
↓
Payment appears

SUPPORT:

Business creates ticket
↓
Admin sees ticket
↓
Admin deletes ticket
↓
Supabase DELETE
↓
Refresh
↓
Ticket remains deleted

━━━━━━━━━━━━━━━━━━━━━━━━━━

50. BUILD STRATEGY

IMPORTANT:

Do NOT attempt to build everything blindly at once.

Build the application in phases.

PHASE 1:

Database Architecture
Supabase
Authentication
Profiles
Businesses
Business Memberships
RLS

PHASE 2:

Business Registration
Email Confirmation
Pending Approval
Admin Approval
Protected Routes

PHASE 3:

Business Dashboard
Capital
Borrowers

PHASE 4:

Loans
Repayment Schedules
Payments
Collections

PHASE 5:

Expenses
Reports
Agreements

PHASE 6:

Admin Dashboard
Business Management
Support System

PHASE 7:

Notifications
Activity Logs
PWA
Final UI

PHASE 8:

Security Audit
Multi-device Testing
Production QA

━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL FINAL RULE

Before declaring any feature complete:

Verify:

The record exists in Supabase.

Refresh the page.

The record is fetched from Supabase.

Logout.

Login.

The record still appears.

Test from another device/session.

Verify tenant isolation.

Never say:

"Successfully created"

unless the database operation actually succeeded.

Never use:

localStorage

mock data

frontend-only state

as the permanent source of financial data.

Build CashFlow as a REAL production-focused SaaS application, not a prototype or demo.

Start by explaining the proposed database schema and relationships before creating the application.

Do not create competing schemas.

Use ONE canonical business_id tenant model consistently throughout the entire application.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/938c4fa0-a2d2-47e8-94b8-3e36493523b0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
