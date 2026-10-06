# Owner app-address system

Venom's embedded Computer backend and phone shell now expose app addresses. These are stable app identifiers, not replacements for the expressive/planetary ontological address grammar.

Open `App addresses` from the phone navigation. Built-in addresses are `app://computer/files`, `build`, `realm`, `resonance`, `synthworld` and `admin` under the same prefix. The native Synthworld entry launches the embedded Godot activity. Other entries open existing Computer surfaces.

Import files up to 2 MB, including binary images, into a private persistent inbox. Route them by address without moving or executing external source files. Download preserves the original bytes. Delivery is to the app's inbox, not a claim that every recipient understands every file. Importing an APK or script does not install or execute it. Arbitrary Android external intents, large streaming imports and direct mesh/Supabase/GitHub delivery are not implemented.

Owner admin is on-device: choose a 6–12 digit PIN on first use; unlock sessions expire after 15 minutes and five failed login attempts impose a one-minute delay. The local backend token remains required for every RPC. PIN hashes and GPT credentials live in separate private persistence files and are excluded from runtime/app snapshots. This is app administration, not Android root/device-administrator access.

Owner settings disable individual apps, suggestions, or the entire address system. Disable preserves files, and owner navigation remains available to turn it back on. The underlying installed apps are not uninstalled. Schedule an app activity with a label and date/time; Home displays a countdown and suggestions explain the scheduled reason or the imported file type. Scheduling does not auto-execute actions, and background Android alarm notifications are not implemented.

The GPT plugin calls the OpenAI Responses API with an owner-supplied API key and configurable GPT model. Only the explicit message is sent; local files and credentials are not attached. The key can be removed. GPT has no execution tools and cannot silently grant permissions or perform admin actions. ChatGPT subscriptions do not provide API credentials. No real-provider acceptance test is claimed without a supplied key.

This implementation is in the Venom Computer runtime. Hover's separate 5.8 server and iOS do not yet expose this admin/address interface.
