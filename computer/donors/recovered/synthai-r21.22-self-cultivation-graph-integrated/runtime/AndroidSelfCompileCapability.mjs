/**
 * Capability model for on-device rebuilds. This does not ship Tribler's old
 * Android toolchain; it captures the demonstrated pipeline as a capability Synthia
 * can satisfy with the current local Android/Termux toolchain when present.
 */
export class AndroidSelfCompileCapability{
  constructor(){this.reference='https://github.com/Tribler/self-compile-Android';}
  inspect(env={}){const have=new Set(env.commands||[]);const steps=['prepare-source','compile-resources','compile-source','dex','package','sign','verify','request-install'];const modern={node:have.has('node'),java:have.has('java')||have.has('javac'),aapt:have.has('aapt')||have.has('aapt2'),signer:have.has('apksigner')||have.has('jarsigner')};return {type:'android-self-compile-capability',steps,available:Object.values(modern).filter(Boolean).length>=3,modern,reference:this.reference,note:'reference pattern only; no legacy binaries or viral-spreading behavior imported'};}
}
export default AndroidSelfCompileCapability;
