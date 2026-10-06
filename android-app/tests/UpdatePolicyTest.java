import app.synthai.updates.UpdatePolicy;
public final class UpdatePolicyTest {
    static void check(boolean value) { if (!value) throw new AssertionError("Update policy violation"); }
    public static void main(String[] args) {
        check(UpdatePolicy.accepts("computer", 1, "computer", 2, new String[]{"key"}, new String[]{"key"}));
        check(!UpdatePolicy.accepts("computer", 1, "other", 2, new String[]{"key"}, new String[]{"key"}));
        check(!UpdatePolicy.accepts("computer", 2, "computer", 1, new String[]{"key"}, new String[]{"key"}));
        check(!UpdatePolicy.accepts("computer", 2, "computer", 2, new String[]{"key"}, new String[]{"key"}));
        check(!UpdatePolicy.accepts("computer", 1, "computer", 2, new String[]{"key"}, new String[]{"other"}));
        check(!UpdatePolicy.accepts("computer", 1, "computer", 2, new String[]{}, new String[]{}));
        check(UpdatePolicy.accepts("computer", 1, "computer", 2, new String[]{"a","b"}, new String[]{"b","a"}));
        System.out.println("PASS: package identity, signer continuity, newer versions, missing keys, signer ordering");
    }
}
