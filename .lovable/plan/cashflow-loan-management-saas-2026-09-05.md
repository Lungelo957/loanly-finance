# CashFlow — Loan Management SaaS

A multi-tenant platform where lending businesses register, get approved by a platform admin, and then manage capital, borrowers, loans, repayments, payments, collections, expenses and reports. Everything is stored in the connected database — nothing is faked or kept only in the browser.

## The data model (one tenant concept: `businesses`)

Every business-owned record carries a single `business_id`. No competing tenant concepts.

```text
auth user ──1:1── profiles (full_name, email, created_at)
             │
             └── user_roles (role: system_admin | business_owner | staff)   [roles live in their own table]

businesses (name, owner_id, location, status, package)
   status: pending → approved/active → suspended | rejected
   │
   ├── business_members (business_id, user_id, role)   ← decides access
   ├── capital_entries (amount, type: initial/injection/withdrawal, note, date)
   ├── borrowers (full_name, phone, email, address, id_number, employment, monthly_income, notes)
   ├── loans (borrower_id, principal, interest_rate, term, frequency, start_date, status)
   │      └── loan_repayments (due_date, amount_due, amount_paid, paid_date, status)
   ├── payments (loan_id, repayment_id, amount, payment_date, reference, notes)
   ├── expenses (category, amount, expense_date, description)
   ├── agreements (borrower_id, loan_id, title, content, file_path, signed_at)
   ├── support_tickets (user_id, subject, message, status, priority)
   ├── notifications (user_id, title, body, read_at)
   └── activity_logs (user_id, action, entity, metadata)
```

### Access rules
- Two security-definer helper functions: `has_role(user, role)` and `is_business_member(business_id)`. Policies call these, so a user can never widen access by editing a form field.
- Every business table: read/write only when the signed-in user is a member of that business. System admin gets read access platform-wide plus the ability to change business status.
- Roles are stored in a dedicated `user_roles` table (never on the profile) to prevent privilege escalation.
- No public/anonymous access anywhere.

### Money calculations (one consistent model)
Flat/simple interest by default: `total interest = principal × rate% × term(years)`; `total repayable = principal + interest`; `installment = total repayable ÷ number of installments` (from the frequency and term). Outstanding balance = total repayable − sum of payments. The schedule rows are generated and stored at loan creation time.

## Build phases

1. **Foundation** — schema + row-level security, profiles/roles trigger on signup, auth pages, session/role/business resolution, protected routes for both portals.
2. **Registration & approval** — `/business/register`, pending screen, `/admin/businesses` approve / reject / activate / suspend, all persisted.
3. **Business workspace** — dashboard with real financial indicators, capital module, borrowers CRUD.
4. **Lending core** — loans + generated repayment schedules, payments, collections views.
5. **Expenses, reports, agreements.**
6. **Admin dashboard, support tickets (both sides), notifications, activity log.**
7. **PWA (manifest, service worker, real install prompt, icon set), mobile polish, security review.**

## Design direction
Cream/off-white surfaces, deep navy text, gold accent, soft shadows, rounded cards, compact responsive stat grid on mobile. All colours defined as design tokens, no ad-hoc styling.

## Notes
- Two portals with separate routes and layouts: `/admin/*` and `/business/*`. Admins cannot use the business workspace and vice-versa.
- Email confirmation is on by default, so a new owner must confirm before signing in. Say the word if you'd prefer instant sign-in for testing.
- The first system admin account has to be granted the admin role directly in the database — I'll tell you exactly how once the schema is in.
