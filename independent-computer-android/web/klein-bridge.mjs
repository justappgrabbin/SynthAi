/* Klein bridge: reuse existing ATO and neural net, never replace donor mechanisms. */
export function makeBridge(K) {
  const valid = (s) => {
    if (typeof s !== "string" || !/^[01]{1,256}$/.test(s))
      throw Error("Expected 1–256 binary digits");
    return s;
  };
  const analogize = (a, b, c, mode = "xnor") => {
    [a, b, c].forEach(valid);
    if (a.length !== b.length || b.length !== c.length) throw Error("Boolean vector widths differ");
    return new K.ATO(mode).solve(a, b, c).toString();
  };
  const create = (seed = 0) => new K.ATONet(6, seed);
  const train = (net, truth = [1, 0, 0, 1], epochs = 1200, lr = 0.5) => {
    if (!Array.isArray(truth) || truth.length !== 4 || truth.some((x) => x !== 0 && x !== 1))
      throw Error("Four Boolean training labels required");
    if (!Number.isInteger(epochs) || epochs < 1 || epochs > 10000)
      throw Error("Epochs must be 1–10000");
    const before = score(net, truth),
      accuracy = net.train(truth, epochs, lr);
    return { before, after: score(net, truth), accuracy, epochs };
  };
  const score = (net, truth) =>
    [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ].filter((x, i) => Number(net.forward(x)[1] > 0.5) === truth[i]).length / 4;
  const snapshot = (net) => ({
    version: 1,
    H: net.H,
    W1: net.W1.map((a) => a.slice()),
    b1: net.b1.slice(),
    W2: net.W2.slice(),
    b2: net.b2,
  });
  const restore = (s) => {
    if (
      !s ||
      s.version !== 1 ||
      !Number.isInteger(s.H) ||
      s.H < 1 ||
      s.H > 128 ||
      !Array.isArray(s.W1) ||
      s.W1.length !== 2 ||
      s.W1.some((a) => !Array.isArray(a) || a.length !== s.H) ||
      !Array.isArray(s.b1) ||
      s.b1.length !== s.H ||
      !Array.isArray(s.W2) ||
      s.W2.length !== s.H ||
      ![...s.W1.flat(), ...s.b1, ...s.W2, s.b2].every(Number.isFinite)
    )
      throw Error("Invalid neural checkpoint");
    const n = new K.ATONet(s.H, 0);
    n.W1 = s.W1.map((a) => a.slice());
    n.b1 = s.b1.slice();
    n.W2 = s.W2.slice();
    n.b2 = s.b2;
    return n;
  };
  return { analogize, create, train, score, snapshot, restore };
}
