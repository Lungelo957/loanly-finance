<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- PWA: vite-plugin-pwa generateSW (outDir dist/client, no HTML/API caching) registered only via src/lib/pwa-register.ts; manifest lives in public/manifest.webmanifest. Why: single safe SW that never caches private financial data or runs in preview.
- Keep shared presentation in semantic CSS tokens and reuse SiteCredit across public and portal footers; this keeps visual updates and attribution consistent without touching business logic.
