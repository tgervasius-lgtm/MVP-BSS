# Contextual help

Issue #254, owner authorized 2026-10-05. Baseline main 37fbefd.

Core existing screens provide a short role-aware instruction and a Help button.
The instruction can be hidden per role/screen on the current device, then reopened
in a help sheet and restored. Only a static UI preference is stored locally;
no personal or business data is stored by this feature. If durable browser storage
is unavailable, the existing runtime adapter retains the preference in memory.

Help uses the existing modal's keyboard, Escape and focus-return behavior.
It does not grant access, fetch additional data, or hide validation errors,
decision confirmations or operational notices. Unsupported screens have no helper.
Guidance describes existing main behavior and does not depend on unmerged #253.

Verify dismissal, navigation/reload persistence, reopening/restoring, role/screen
separation, keyboard/focus and desktop/mobile axe. Revert this isolated frontend
PR for rollback; no backend/API/migration changes. Old preference keys are harmless.
