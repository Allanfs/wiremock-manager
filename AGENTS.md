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

## Architecture
- WireMock is the source of truth; never store mappings in a database. Why: the app is a UI over the Admin API.
- All HTTP goes through `src/lib/wiremock/client.ts` (WireMockClient) or the demo `MockDataSource`, both implementing `WireMockDataSource`; components use hooks in `hooks.ts`. Why: keeps transport out of UI and lets demo/live swap.
- Mapping rules (classification, priority ordering, conflicts) live as pure functions in `transform.ts`; form<->JSON conversion in `form-model.ts`. Why: testable without UI.
- "Disable" is emulated by adding an impossible header matcher plus `metadata.wmmDisabled`. Why: WireMock has no native disable.
