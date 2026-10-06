# Native Synthworld inside the Computer

Venom and Hover include Godot 4.6.3 and the repaired SYNTHWORLD project in the same APK.
The launcher opens a non-exported native activity in its own process, keeping
Godot shutdown separate from the computer backend. CI imports and tests the
source before exporting its PCK into the APK. The game pack is loaded directly from packaged Android assets using the
Android resource reader and an explicit OpenGL compatibility driver; Godot's user data and the computer's backend state are not replaced.

The embedded source includes the real lighting, proximity repair and truthful
command-execution fixes. This integration does not turn the prototype into a
complete request-driven nested swarm scene generator. BiVerse/jobkit adapters
and shared contact/identity/event synchronization are not yet connected to the
native game. Both phone faces include update checking and a native game launcher.

## Automatic Android updates

Both APKs check at launch and daily when connected. The worker downloads from
the repository's `computer-updates` release channel, then checks package ID,
version increase and matching installed signer before offering installation.
Android requires installation approval and initially enabling installation from
this computer. Declining defers the prompt for a day. Updates use the normal
package installer so existing app data is retained.

CI publishes updates only with a persistent signing key configured; temporary
runner debug keys cannot update an existing differently signed installation.
The first persistent-key APK may therefore need a migration from older builds;
do not uninstall an old build until its saved data has been exported.

Setup uses `scripts/configure-update-signing.py --directory <private-directory>`
with an authenticated GitHub CLI and JDK. It reuses existing private key files
and sets the four `SYNTHAI_UPDATE_*` GitHub Actions secrets without printing them.
`--prepare-only` creates private local material without uploading anything.
Those secrets are not part of the repository or APK. Current signing material
is prepared privately, but the connected GitHub integration returns HTTP 403 for Actions secret
management. Publication remains disabled until those secrets can be configured.

Android acceptance now launches the native game and requires both engine-main-loop
and loaded-world markers. The screenshot-reported setup failure is not considered
resolved on the creator’s device until the rebuilt APK opens there.
