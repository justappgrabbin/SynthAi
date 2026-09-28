import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView
} from "react-native";
const createMCPClient = () => ({
  callTool: async (name, args) => {
    console.log(`Tool call: ${name}`, args);
    return { result: { mock: true, tool: name, args } };
  },
  readResource: async (uri) => {
    console.log(`Resource read: ${uri}`);
    return { mock: true };
  }
});
const GateVisualizer = ({ gate, size = 120 }) => {
  const hex = gateToBinary(gate);
  const lines = hex.split("").map((bit, i) => /* @__PURE__ */ React.createElement(
    View,
    {
      key: i,
      style: [
        styles.hexLine,
        bit === "1" ? styles.yangLine : styles.yinLine,
        { width: size * 0.8 }
      ]
    }
  ));
  return /* @__PURE__ */ React.createElement(View, { style: [styles.gateVisualizer, { width: size, height: size }] }, /* @__PURE__ */ React.createElement(Text, { style: styles.gateNumber }, gate), /* @__PURE__ */ React.createElement(View, { style: styles.hexagramContainer }, lines));
};
const SentenceCard = ({
  sentence,
  type,
  score
}) => /* @__PURE__ */ React.createElement(View, { style: styles.sentenceCard }, /* @__PURE__ */ React.createElement(View, { style: styles.sentenceHeader }, /* @__PURE__ */ React.createElement(Text, { style: styles.sentenceType }, type), score !== void 0 && /* @__PURE__ */ React.createElement(Text, { style: styles.scoreBadge }, (score * 100).toFixed(1), "%")), /* @__PURE__ */ React.createElement(Text, { style: styles.sentenceText }, sentence));
const ResonanceMeter = ({ score }) => {
  const color = score > 0.7 ? "#4CAF50" : score > 0.4 ? "#FF9800" : "#F44336";
  return /* @__PURE__ */ React.createElement(View, { style: styles.resonanceContainer }, /* @__PURE__ */ React.createElement(Text, { style: styles.resonanceLabel }, "Resonance"), /* @__PURE__ */ React.createElement(View, { style: styles.resonanceBar }, /* @__PURE__ */ React.createElement(View, { style: [styles.resonanceFill, { width: `${score * 100}%`, backgroundColor: color }] })), /* @__PURE__ */ React.createElement(Text, { style: [styles.resonanceValue, { color }] }, (score * 100).toFixed(1), "%"));
};
const NarrativeTree = ({ steps }) => /* @__PURE__ */ React.createElement(View, { style: styles.treeContainer }, steps.map((step, i) => /* @__PURE__ */ React.createElement(View, { key: i, style: styles.treeNode }, /* @__PURE__ */ React.createElement(View, { style: styles.treeConnector }), /* @__PURE__ */ React.createElement(View, { style: styles.treeContent }, /* @__PURE__ */ React.createElement(Text, { style: styles.treeStep }, "Step ", step.step + 1), /* @__PURE__ */ React.createElement(Text, { style: styles.treeHexagram }, step.hexagram), /* @__PURE__ */ React.createElement(Text, { style: styles.treeSentence, numberOfLines: 2 }, step.sentence), /* @__PURE__ */ React.createElement(View, { style: styles.w5Indicator }, /* @__PURE__ */ React.createElement(Text, { style: styles.w5Label }, "w5: ", (step.w5 * 100).toFixed(0), "%"), /* @__PURE__ */ React.createElement(View, { style: [styles.w5Bar, { width: `${step.w5 * 100}%` }] }))))));
const LivingMirrorApp = () => {
  const [mcpClient] = useState(() => createMCPClient());
  const [query, setQuery] = useState("");
  const [userProfile, setUserProfile] = useState({
    name: "",
    designSunGate: 6,
    designSunLine: 4,
    designSunColor: 4,
    designSunTone: 3,
    designSunBase: 2,
    earthGate: 36,
    earthLine: 1
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [gateQuery, setGateQuery] = useState(null);
  const handleQuery = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const gateResult = await mcpClient.callTool("query_gate", {
        gate: userProfile.designSunGate,
        line: userProfile.designSunLine,
        color: userProfile.designSunColor,
        tone: userProfile.designSunTone,
        base: userProfile.designSunBase
      });
      setGateQuery(gateResult.result);
      const simResult = await mcpClient.callTool("simulate_narrative", {
        query,
        chartData: {
          sunGate: userProfile.designSunGate,
          sunLine: userProfile.designSunLine,
          sunColor: userProfile.designSunColor,
          sunTone: userProfile.designSunTone,
          sunBase: userProfile.designSunBase,
          earthGate: userProfile.earthGate,
          earthLine: userProfile.earthLine
        },
        nSamples: 1e3,
        maxSteps: 20,
        seed: 42
      });
      setResult(simResult.result);
    } catch (err) {
      console.error("Query failed:", err);
    } finally {
      setLoading(false);
    }
  }, [query, userProfile, mcpClient]);
  const handleGateLookup = useCallback(async (gate) => {
    const result2 = await mcpClient.callTool("query_gate", {
      gate,
      line: 1,
      color: 1,
      tone: 1,
      base: 1
    });
    setGateQuery(result2.result);
  }, [mcpClient]);
  return /* @__PURE__ */ React.createElement(SafeAreaView, { style: styles.container }, /* @__PURE__ */ React.createElement(ScrollView, { contentContainerStyle: styles.scrollContent }, /* @__PURE__ */ React.createElement(View, { style: styles.header }, /* @__PURE__ */ React.createElement(Text, { style: styles.title }, "Living Mirror"), /* @__PURE__ */ React.createElement(Text, { style: styles.subtitle }, "DISEMINER \u2014 Deterministic Archetypal Narrative")), /* @__PURE__ */ React.createElement(View, { style: styles.profileSection }, /* @__PURE__ */ React.createElement(Text, { style: styles.sectionTitle }, "Your Design"), /* @__PURE__ */ React.createElement(View, { style: styles.profileRow }, /* @__PURE__ */ React.createElement(GateVisualizer, { gate: userProfile.designSunGate, size: 100 }), /* @__PURE__ */ React.createElement(View, { style: styles.profileDetails }, /* @__PURE__ */ React.createElement(Text, { style: styles.profileText }, "Gate ", userProfile.designSunGate, ".", userProfile.designSunLine), /* @__PURE__ */ React.createElement(Text, { style: styles.profileText }, "Color ", userProfile.designSunColor, " \xB7 Tone ", userProfile.designSunTone, " \xB7 Base ", userProfile.designSunBase)))), /* @__PURE__ */ React.createElement(View, { style: styles.querySection }, /* @__PURE__ */ React.createElement(Text, { style: styles.sectionTitle }, "Your Question"), /* @__PURE__ */ React.createElement(
    TextInput,
    {
      style: styles.queryInput,
      multiline: true,
      placeholder: "What do you want to explore?",
      placeholderTextColor: "#666",
      value: query,
      onChangeText: setQuery
    }
  ), /* @__PURE__ */ React.createElement(
    TouchableOpacity,
    {
      style: [styles.queryButton, loading && styles.queryButtonDisabled],
      onPress: handleQuery,
      disabled: loading
    },
    loading ? /* @__PURE__ */ React.createElement(ActivityIndicator, { color: "#fff" }) : /* @__PURE__ */ React.createElement(Text, { style: styles.queryButtonText }, "Explore Narrative")
  )), gateQuery && /* @__PURE__ */ React.createElement(View, { style: styles.resultSection }, /* @__PURE__ */ React.createElement(Text, { style: styles.sectionTitle }, "Gate Reading"), /* @__PURE__ */ React.createElement(
    SentenceCard,
    {
      sentence: gateQuery.sentence || "Loading...",
      type: gateQuery.sentenceType || "Unknown"
    }
  ), gateQuery.codon && /* @__PURE__ */ React.createElement(View, { style: styles.codonCard }, /* @__PURE__ */ React.createElement(Text, { style: styles.codonText }, "Codon: ", gateQuery.codon.codon, " \u2192 ", gateQuery.codon.aminoAcid, " (", gateQuery.codon.aminoAcidLetter, ")"), /* @__PURE__ */ React.createElement(Text, { style: styles.codonText }, "Mineral: ", gateQuery.codon.mineralClass, " (Z=", gateQuery.codon.atomicNumber, ")"))), result && /* @__PURE__ */ React.createElement(View, { style: styles.resultSection }, /* @__PURE__ */ React.createElement(Text, { style: styles.sectionTitle }, "Narrative Path"), /* @__PURE__ */ React.createElement(ResonanceMeter, { score: result.bestPath.finalScore }), /* @__PURE__ */ React.createElement(View, { style: styles.trajectoryBadge }, /* @__PURE__ */ React.createElement(Text, { style: styles.trajectoryText }, "Trajectory: ", result.bestPath.trajectory.toUpperCase()), /* @__PURE__ */ React.createElement(Text, { style: styles.stepCount }, result.bestPath.stepCount, " steps to convergence")), /* @__PURE__ */ React.createElement(
    SentenceCard,
    {
      sentence: result.bestPath.convergencePoint,
      type: "Convergence",
      score: result.bestPath.finalScore
    }
  ), /* @__PURE__ */ React.createElement(Text, { style: styles.sectionTitle }, "Path Steps"), /* @__PURE__ */ React.createElement(NarrativeTree, { steps: result.bestPath.keySteps }), /* @__PURE__ */ React.createElement(Text, { style: styles.sectionTitle }, "Alternative Paths"), result.top5Summary.slice(1).map((path, i) => /* @__PURE__ */ React.createElement(
    TouchableOpacity,
    {
      key: i,
      style: styles.altPathCard,
      onPress: () => {
      }
    },
    /* @__PURE__ */ React.createElement(Text, { style: styles.altPathRank }, "#", path.rank),
    /* @__PURE__ */ React.createElement(View, { style: styles.altPathInfo }, /* @__PURE__ */ React.createElement(Text, { style: styles.altPathScore }, (path.score * 100).toFixed(1), "% resonance"), /* @__PURE__ */ React.createElement(Text, { style: styles.altPathMeta }, path.trajectory, " \xB7 ", path.steps, " steps"))
  )), /* @__PURE__ */ React.createElement(View, { style: styles.statsCard }, /* @__PURE__ */ React.createElement(Text, { style: styles.statsTitle }, "Distribution"), /* @__PURE__ */ React.createElement(Text, { style: styles.statsText }, "Mean: ", (result.statistics.meanScore * 100).toFixed(1), "% \xB7 StdDev: ", (result.statistics.stdDev * 100).toFixed(1), "%"), Object.entries(result.statistics.convergenceRates).map(([key, val]) => /* @__PURE__ */ React.createElement(Text, { key, style: styles.statsText }, key, ": ", (val * 100).toFixed(1), "%")))), /* @__PURE__ */ React.createElement(View, { style: styles.gateBrowser }, /* @__PURE__ */ React.createElement(Text, { style: styles.sectionTitle }, "Explore Gates"), /* @__PURE__ */ React.createElement(View, { style: styles.gateGrid }, Array.from({ length: 16 }, (_, i) => i + 1).map((gate) => /* @__PURE__ */ React.createElement(
    TouchableOpacity,
    {
      key: gate,
      style: styles.gateButton,
      onPress: () => handleGateLookup(gate)
    },
    /* @__PURE__ */ React.createElement(Text, { style: styles.gateButtonText }, gate)
  ))))));
};
function gateToBinary(gate) {
  const hex = gate.toString(2).padStart(6, "0");
  return hex;
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0f"
  },
  scrollContent: {
    padding: 16
  },
  header: {
    marginBottom: 24,
    alignItems: "center"
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#e0e0ff",
    letterSpacing: 2
  },
  subtitle: {
    fontSize: 12,
    color: "#8888aa",
    marginTop: 4,
    letterSpacing: 1
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#c0c0e0",
    marginBottom: 12,
    marginTop: 16
  },
  profileSection: {
    backgroundColor: "#12121f",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  profileDetails: {
    marginLeft: 16,
    flex: 1
  },
  profileText: {
    color: "#a0a0c0",
    fontSize: 14,
    marginBottom: 4
  },
  querySection: {
    marginBottom: 16
  },
  queryInput: {
    backgroundColor: "#12121f",
    borderRadius: 12,
    padding: 16,
    color: "#e0e0ff",
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#2a2a4a"
  },
  queryButton: {
    backgroundColor: "#4a4a8a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 12
  },
  queryButtonDisabled: {
    opacity: 0.5
  },
  queryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  resultSection: {
    marginBottom: 16
  },
  sentenceCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#6a6aaa"
  },
  sentenceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  sentenceType: {
    color: "#8888cc",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  scoreBadge: {
    color: "#4CAF50",
    fontSize: 12,
    fontWeight: "600"
  },
  sentenceText: {
    color: "#e0e0ff",
    fontSize: 16,
    lineHeight: 24
  },
  codonCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12
  },
  codonText: {
    color: "#a0a0c0",
    fontSize: 13
  },
  resonanceContainer: {
    marginBottom: 16
  },
  resonanceLabel: {
    color: "#8888aa",
    fontSize: 12,
    marginBottom: 4
  },
  resonanceBar: {
    height: 8,
    backgroundColor: "#2a2a4a",
    borderRadius: 4,
    overflow: "hidden"
  },
  resonanceFill: {
    height: "100%",
    borderRadius: 4
  },
  resonanceValue: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "right"
  },
  trajectoryBadge: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12
  },
  trajectoryText: {
    color: "#c0c0e0",
    fontSize: 14,
    fontWeight: "600"
  },
  stepCount: {
    color: "#8888aa",
    fontSize: 12
  },
  treeContainer: {
    marginLeft: 8
  },
  treeNode: {
    flexDirection: "row",
    marginBottom: 12
  },
  treeConnector: {
    width: 2,
    backgroundColor: "#3a3a6a",
    marginRight: 12
  },
  treeContent: {
    flex: 1,
    backgroundColor: "#12121f",
    borderRadius: 8,
    padding: 12
  },
  treeStep: {
    color: "#8888aa",
    fontSize: 11,
    marginBottom: 2
  },
  treeHexagram: {
    color: "#c0c0e0",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4
  },
  treeSentence: {
    color: "#a0a0c0",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8
  },
  w5Indicator: {
    flexDirection: "row",
    alignItems: "center"
  },
  w5Label: {
    color: "#8888aa",
    fontSize: 11,
    width: 50
  },
  w5Bar: {
    height: 4,
    backgroundColor: "#4a4a8a",
    borderRadius: 2,
    flex: 1
  },
  altPathCard: {
    flexDirection: "row",
    backgroundColor: "#12121f",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: "center"
  },
  altPathRank: {
    color: "#6a6aaa",
    fontSize: 18,
    fontWeight: "bold",
    width: 40
  },
  altPathInfo: {
    flex: 1
  },
  altPathScore: {
    color: "#c0c0e0",
    fontSize: 14
  },
  altPathMeta: {
    color: "#8888aa",
    fontSize: 12,
    marginTop: 2
  },
  statsCard: {
    backgroundColor: "#12121f",
    borderRadius: 12,
    padding: 16,
    marginTop: 16
  },
  statsTitle: {
    color: "#c0c0e0",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8
  },
  statsText: {
    color: "#a0a0c0",
    fontSize: 13,
    marginBottom: 4
  },
  gateBrowser: {
    marginTop: 24
  },
  gateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  gateButton: {
    width: 50,
    height: 50,
    backgroundColor: "#1a1a2e",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2a4a"
  },
  gateButtonText: {
    color: "#c0c0e0",
    fontSize: 16,
    fontWeight: "600"
  },
  gateVisualizer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    borderRadius: 12
  },
  gateNumber: {
    color: "#6a6aaa",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8
  },
  hexagramContainer: {
    alignItems: "center"
  },
  hexLine: {
    height: 4,
    marginVertical: 3,
    borderRadius: 2
  },
  yangLine: {
    backgroundColor: "#e0e0ff"
  },
  yinLine: {
    backgroundColor: "#e0e0ff",
    width: "40%"
  }
});
var stdin_default = LivingMirrorApp;
export {
  stdin_default as default
};
