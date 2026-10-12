package app.prismkeys;
/** The keyboard host hides itself before Synthia gestures; it does not install a second floating overlay. */
final class OverlayService {static void hideForAction(long delay){PrismIME.hideForHandAction();}}
