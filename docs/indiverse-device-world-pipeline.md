# IndiVerse device-world pipeline

## Canonical statement

**IndiVerse is the Computer World.** It does not place a themed launcher in front of the device. It resolves the actual device, including the interiors of ordinary app interfaces, into a navigable world.

The device remains the source of truth. Legacy-style resolution turns source objects and interface primitives into reusable world bricks. IndiVerse supplies host-specific visual/qualia grammar. Actions on rendered bricks must route back to the real underlying device action and return an observed receipt before the world reports success.

## Runtime pipeline

```text
real Android device
  |
  +-- apps / files / contacts / settings / notifications / processes
  |       |
  |       +--> DeviceWorldResolver
  |              |
  |              +--> canonical device places, artifacts, inhabitants, laws
  |
  +-- current app interface tree
          |
          +--> InterfaceBrickRecognizer
                 |
                 +--> buttons / links / inputs / lists / images / dialogs / etc.
                          |
                          +--> reusable world bricks
                                   |
                                   +--> InterfaceWorldBridge
                                            |
                                            +--> IndiVerse canonical objects
                                            |
                                            +--> Accessibility Overlay renderer
                                            |
                                            +--> user / Synthia action
                                                     |
                                                     +--> bound Android accessibility action
                                                              |
                                                              +--> receipt
```

## Legacy role

Legacy is not merely a file organizer. Its enduring mechanism is:

1. recognize what an incoming thing is,
2. classify its semantic role,
3. assign stable identity/glyph/placement,
4. turn it into reusable construction material,
5. allow larger structures to be composed from those bricks.

The current resolver preserves the five Legacy families:

- ENGINE `◈`
- INTERFACE `◯`
- AGENT `◆`
- WORLD `⬡`
- KNOWLEDGE `◉`

## Interface brick vocabulary

Initial canonical mappings:

- text input -> writing desk
- button -> control plinth
- link -> door
- switch / checkbox -> lever
- slider -> dial
- list -> shelf wall
- scroll surface -> corridor
- image -> mural
- text / heading -> sign
- dialog -> room
- toolbar -> counter
- WebView -> district
- item/card/container -> display case / world brick

These are semantic defaults, not locked art. IndiVerse may render the same canonical brick differently without changing its identity or underlying device binding.

## Non-negotiable action rule

A rendered interaction is not successful merely because the overlay animates.

```text
world object interaction
  -> canonical affordance
  -> Android node binding
  -> actual native action
  -> Android result
  -> receipt
  -> observed interface re-snapshot
  -> world state update
```

Failure stays visible as failure. No fake door-open, send, toggle, navigation, text-entry, or completion state.

## Privacy

Live interface interiors are private by default. Password node text and hints are intentionally excluded from accessibility snapshots. Sharing into YOU-N-I-VERSE requires a separate explicit boundary.

## Rendering

The Accessibility Overlay is the device-wide rendering surface for external apps. The underlying app remains real and executable while IndiVerse replaces its conventional page presentation with resolved world geometry. A temporary RAW escape exists so an unrecognized or imperfectly resolved interface never traps the user.

The overlay's current geometry is a proof renderer, not the final art direction. Renderer replacement must not change canonical recognition or action bindings.
