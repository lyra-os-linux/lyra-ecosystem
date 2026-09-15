# Required CI for main

The GitHub branch protection for `main` requires these exact check names from
GitHub Actions (app ID `15368`), published by the `Catalog contracts` workflow:

| Required check | Coverage |
| --- | --- |
| `validate` | Catalog owners, repositories and dependency graph; shared release, signing and documentation contracts; the Python test suite. |
| `readonly-gate` | Unit tests for the read-only integration gate, including solver XML validation, transport bounds and failure evidence. |
| `offline-build-driver` | Unit tests for source isolation, archive safety and reproducibility, dependency integrity, sandbox command construction and failure handling. |

The branch must be up to date before merging (`strict=true`). Protection applies
to administrators (`enforce_admins=true`). Changes use pull requests; no extra
reviewer approval is required. Force pushes and branch deletion are disabled.
This policy is configured in GitHub settings, not by this Markdown file.

## Coverage limits

The existing workflow runs on every PR without path or branch filters, and its
required jobs have no job-level skip condition. `validate` clones the current
default branches of the cataloged repositories, so it detects portfolio drift
but does not qualify a fixed cross-repository release snapshot.

`readonly-gate` does not boot a VM. `offline-build-driver` tests the build driver;
it does not perform the full offline product build matrix or prove live network
isolation. These checks do not replace native GNOME acceptance, installed RPM
validation, signed OBS artifact qualification or the two locally built ISO gates.

## Qualification

On 2026-09-15 the API returned HTTP 404 (`Branch not protected`) for `main`.
The branch reported `protected=false`, and its applicable-rules query returned
an empty list. Protection therefore had to be created. The existing workflow
already published all three successful checks, including `offline-build-driver`,
which was added after the original issue was written.

[PR #28](https://github.com/lyra-os-linux/lyra-ecosystem/pull/28) exercised actual
merge requests using the administrator account and the exact head revision
`ab547478742e198ab4b2be856058b41b138a2d02`:

| Required check state | Merge response |
| --- | --- |
| Running | HTTP 405: `Required status check "validate" is in progress.` |
| Intentionally failed | HTTP 405: `Required status check "validate" is failing.` |

The [controlled run](https://github.com/lyra-os-linux/lyra-ecosystem/actions/runs/34995648150)
used a temporary failure step limited to that PR branch. Both refusals left
`main` at `f2baf2612d5d98015dcba05b25e5ef0fd6843b47`. The probe was then removed,
restoring the workflow byte for byte before running the full CI and integrating
this documentation. The final passing run and successful squash merge receipt
are recorded in [issue #1](https://github.com/lyra-os-linux/lyra-ecosystem/issues/1).

## Exceptions and recovery

No user, team or app bypass is configured in this branch protection. Repository
administrators can still deliberately edit or remove the rules; administrator
enforcement constrains merges while the policy is in effect.

GitHub also accepts `neutral` and `skipped` check conclusions. Keep all required
jobs executing when changing workflow conditions. If a check name or producer
changes, update protection to the exact published name and app identity.

If an explicitly approved recovery requires reverting this change, restore the
recorded unprotected baseline by removing this branch protection. That also
removes its PR, CI, force-push and deletion safeguards. Diagnose a failing check
before considering that recovery; do not disable protection for routine merges.
