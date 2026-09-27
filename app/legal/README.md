# Momo Legal Center — draft checklist

The pages under `/legal` are intentionally kept in **draft** mode until the contracting entity and final legal review are complete.

## Before changing `legalConfig.status` to `published`

1. Fill every empty legal identity/contact field in `app/legal/legal-config.ts`:
   - `legalEntityName`
   - `registrationNumber`
   - `registeredAddress`
   - `countryOfEstablishment`
   - `privacyContact`
   - `legalContact`
2. Confirm governing law, courts, liability limits, cancellation, payment and billing wording with the final contracting setup.
3. Confirm the final DPA/signature process and customer subprocessors notice process.
4. Verify the retention implementation against `app/legal/retention/page.tsx`:
   - conversations: 12 months by default;
   - widget leads: 12 months by default;
   - ordinary service cancellation recovery window: 90 days;
   - verified deletion/return instructions are handled separately and may be completed earlier;
   - resolved support tickets: 12 months;
   - dormant Momo commercial leads: 12 months;
   - Momo-controlled technical rate-limit counters: up to 48 hours after the last update, eligible for deletion on the next configured retention cycle;
   - separate security-incident retention: future work only, not currently implemented.
5. Portal privacy controls now provide:
   - organisation JSON export for owners;
   - verified deletion request that creates a high-priority privacy support ticket.
6. The Admin now has **dry-run review + controlled manual cleanup + scheduled automatic cleanup** for widget conversations/leads, resolved support tickets, dormant Momo sales data and technical API rate-limit counters. Manual cleanup requires explicit confirmation; automatic cleanup creates a fresh dry-run immediately before deletion. Both paths revalidate the eligible-data fingerprint and execute transactionally. The automatic schedule is installed through Supabase Cron and must be explicitly enabled in Admin. Normal post-cancellation recovery tracking is implemented, including service suspension and expiry-to-purge-review. Final destructive account purge remains admin-confirmed; no separate security-incident history or cleanup exists yet. Technical rate-limit cleanup requires verification in production before legal publication. Keep the legal center in draft until every published deadline is actually enforced or covered by a documented manual procedure.
7. Review provider retention/settings for OpenAI, Supabase, Vercel and Resend before publication and repeat that review periodically.
8. Review the complete documents with qualified Portuguese/EU legal counsel before relying on them as final legal documents.

When ready, change:

```ts
status: "draft"
```

to:

```ts
status: "published"
```

Public legal-footer links are intentionally gated by that status.
