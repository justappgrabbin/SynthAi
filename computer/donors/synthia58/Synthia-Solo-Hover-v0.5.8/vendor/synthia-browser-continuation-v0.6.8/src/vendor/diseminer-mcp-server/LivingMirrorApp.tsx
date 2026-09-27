// ============================================================
// Living Mirror — React Native Client
// DISEMINER MCP Client for deterministic archetypal narrative
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';

// ─────────────────────────────────────────────────────────────
// MCP CLIENT (simplified — replace with actual MCP SDK)
// ─────────────────────────────────────────────────────────────

interface MCPClient {
  callTool: (name: string, args: any) => Promise<any>;
  readResource: (uri: string) => Promise<any>;
}

// Placeholder: replace with actual MCP client initialization
const createMCPClient = (): MCPClient => ({
  callTool: async (name: string, args: any) => {
    // In production: connect to diseminer-mcp-server via stdio or SSE
    // For now: mock responses for UI development
    console.log(`Tool call: ${name}`, args);
    return { result: { mock: true, tool: name, args } };
  },
  readResource: async (uri: string) => {
    console.log(`Resource read: ${uri}`);
    return { mock: true };
  }
});

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface UserProfile {
  name: string;
  designSunGate: number;
  designSunLine: number;
  designSunColor: number;
  designSunTone: number;
  designSunBase: number;
  earthGate: number;
  earthLine: number;
}

interface NarrativeStep {
  step: number;
  house: number;
  hexagram: string;
  sentence: string;
  w5: number;
}

interface SimulationResult {
  bestPath: {
    finalScore: number;
    convergencePoint: string;
    trajectory: string;
    stepCount: number;
    keySteps: NarrativeStep[];
  };
  top5Summary: Array<{
    rank: number;
    score: number;
    trajectory: string;
    steps: number;
    convergence: string;
  }>;
  statistics: {
    meanScore: number;
    stdDev: number;
    convergenceRates: Record<string, number>;
  };
}

// ─────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────

const GateVisualizer: React.FC<{ gate: number; size?: number }> = ({ gate, size = 120 }) => {
  // Visual representation of a gate as hexagram lines
  const hex = gateToBinary(gate);
  const lines = hex.split('').map((bit, i) => (
    <View
      key={i}
      style={[
        styles.hexLine,
        bit === '1' ? styles.yangLine : styles.yinLine,
        { width: size * 0.8 }
      ]}
    />
  ));

  return (
    <View style={[styles.gateVisualizer, { width: size, height: size }]}>
      <Text style={styles.gateNumber}>{gate}</Text>
      <View style={styles.hexagramContainer}>{lines}</View>
    </View>
  );
};

const SentenceCard: React.FC<{ sentence: string; type: string; score?: number }> = ({
  sentence,
  type,
  score
}) => (
  <View style={styles.sentenceCard}>
    <View style={styles.sentenceHeader}>
      <Text style={styles.sentenceType}>{type}</Text>
      {score !== undefined && (
        <Text style={styles.scoreBadge}>{(score * 100).toFixed(1)}%</Text>
      )}
    </View>
    <Text style={styles.sentenceText}>{sentence}</Text>
  </View>
);

const ResonanceMeter: React.FC<{ score: number }> = ({ score }) => {
  const color = score > 0.7 ? '#4CAF50' : score > 0.4 ? '#FF9800' : '#F44336';
  return (
    <View style={styles.resonanceContainer}>
      <Text style={styles.resonanceLabel}>Resonance</Text>
      <View style={styles.resonanceBar}>
        <View style={[styles.resonanceFill, { width: `${score * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.resonanceValue, { color }]}>{(score * 100).toFixed(1)}%</Text>
    </View>
  );
};

const NarrativeTree: React.FC<{ steps: NarrativeStep[] }> = ({ steps }) => (
  <View style={styles.treeContainer}>
    {steps.map((step, i) => (
      <View key={i} style={styles.treeNode}>
        <View style={styles.treeConnector} />
        <View style={styles.treeContent}>
          <Text style={styles.treeStep}>Step {step.step + 1}</Text>
          <Text style={styles.treeHexagram}>{step.hexagram}</Text>
          <Text style={styles.treeSentence} numberOfLines={2}>{step.sentence}</Text>
          <View style={styles.w5Indicator}>
            <Text style={styles.w5Label}>w5: {(step.w5 * 100).toFixed(0)}%</Text>
            <View style={[styles.w5Bar, { width: `${step.w5 * 100}%` }]} />
          </View>
        </View>
      </View>
    ))}
  </View>
);

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────

const LivingMirrorApp: React.FC = () => {
  const [mcpClient] = useState(() => createMCPClient());
  const [query, setQuery] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    designSunGate: 6,
    designSunLine: 4,
    designSunColor: 4,
    designSunTone: 3,
    designSunBase: 2,
    earthGate: 36,
    earthLine: 1
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [gateQuery, setGateQuery] = useState<string | null>(null);

  const handleQuery = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);

    try {
      // 1. Query gate data for user's design sun
      const gateResult = await mcpClient.callTool('query_gate', {
        gate: userProfile.designSunGate,
        line: userProfile.designSunLine,
        color: userProfile.designSunColor,
        tone: userProfile.designSunTone,
        base: userProfile.designSunBase
      });
      setGateQuery(gateResult.result);

      // 2. Run narrative simulation
      const simResult = await mcpClient.callTool('simulate_narrative', {
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
        nSamples: 1000,
        maxSteps: 20,
        seed: 42
      });
      setResult(simResult.result);
    } catch (err) {
      console.error('Query failed:', err);
    } finally {
      setLoading(false);
    }
  }, [query, userProfile, mcpClient]);

  const handleGateLookup = useCallback(async (gate: number) => {
    const result = await mcpClient.callTool('query_gate', {
      gate,
      line: 1,
      color: 1,
      tone: 1,
      base: 1
    });
    setGateQuery(result.result);
  }, [mcpClient]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Living Mirror</Text>
          <Text style={styles.subtitle}>DISEMINER — Deterministic Archetypal Narrative</Text>
        </View>

        {/* User Profile */}
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Your Design</Text>
          <View style={styles.profileRow}>
            <GateVisualizer gate={userProfile.designSunGate} size={100} />
            <View style={styles.profileDetails}>
              <Text style={styles.profileText}>
                Gate {userProfile.designSunGate}.{userProfile.designSunLine}
              </Text>
              <Text style={styles.profileText}>
                Color {userProfile.designSunColor} · Tone {userProfile.designSunTone} · Base {userProfile.designSunBase}
              </Text>
            </View>
          </View>
        </View>

        {/* Query Input */}
        <View style={styles.querySection}>
          <Text style={styles.sectionTitle}>Your Question</Text>
          <TextInput
            style={styles.queryInput}
            multiline
            placeholder="What do you want to explore?"
            placeholderTextColor="#666"
            value={query}
            onChangeText={setQuery}
          />
          <TouchableOpacity
            style={[styles.queryButton, loading && styles.queryButtonDisabled]}
            onPress={handleQuery}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.queryButtonText}>Explore Narrative</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Gate Query Result */}
        {gateQuery && (
          <View style={styles.resultSection}>
            <Text style={styles.sectionTitle}>Gate Reading</Text>
            <SentenceCard
              sentence={gateQuery.sentence || 'Loading...'}
              type={gateQuery.sentenceType || 'Unknown'}
            />
            {gateQuery.codon && (
              <View style={styles.codonCard}>
                <Text style={styles.codonText}>
                  Codon: {gateQuery.codon.codon} → {gateQuery.codon.aminoAcid} ({gateQuery.codon.aminoAcidLetter})
                </Text>
                <Text style={styles.codonText}>
                  Mineral: {gateQuery.codon.mineralClass} (Z={gateQuery.codon.atomicNumber})
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Simulation Result */}
        {result && (
          <View style={styles.resultSection}>
            <Text style={styles.sectionTitle}>Narrative Path</Text>

            <ResonanceMeter score={result.bestPath.finalScore} />

            <View style={styles.trajectoryBadge}>
              <Text style={styles.trajectoryText}>
                Trajectory: {result.bestPath.trajectory.toUpperCase()}
              </Text>
              <Text style={styles.stepCount}>
                {result.bestPath.stepCount} steps to convergence
              </Text>
            </View>

            <SentenceCard
              sentence={result.bestPath.convergencePoint}
              type="Convergence"
              score={result.bestPath.finalScore}
            />

            <Text style={styles.sectionTitle}>Path Steps</Text>
            <NarrativeTree steps={result.bestPath.keySteps} />

            <Text style={styles.sectionTitle}>Alternative Paths</Text>
            {result.top5Summary.slice(1).map((path, i) => (
              <TouchableOpacity
                key={i}
                style={styles.altPathCard}
                onPress={() => { /* Load this path */ }}
              >
                <Text style={styles.altPathRank}>#{path.rank}</Text>
                <View style={styles.altPathInfo}>
                  <Text style={styles.altPathScore}>{(path.score * 100).toFixed(1)}% resonance</Text>
                  <Text style={styles.altPathMeta}>
                    {path.trajectory} · {path.steps} steps
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Distribution</Text>
              <Text style={styles.statsText}>
                Mean: {(result.statistics.meanScore * 100).toFixed(1)}% · StdDev: {(result.statistics.stdDev * 100).toFixed(1)}%
              </Text>
              {Object.entries(result.statistics.convergenceRates).map(([key, val]) => (
                <Text key={key} style={styles.statsText}>
                  {key}: {(val * 100).toFixed(1)}%
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Quick Gate Browser */}
        <View style={styles.gateBrowser}>
          <Text style={styles.sectionTitle}>Explore Gates</Text>
          <View style={styles.gateGrid}>
            {Array.from({ length: 16 }, (_, i) => i + 1).map(gate => (
              <TouchableOpacity
                key={gate}
                style={styles.gateButton}
                onPress={() => handleGateLookup(gate)}
              >
                <Text style={styles.gateButtonText}>{gate}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

function gateToBinary(gate: number): string {
  // Simplified: return 6-bit binary for hexagram visualization
  // In production: use actual hexagram binary from HEXAGRAMS
  const hex = gate.toString(2).padStart(6, '0');
  return hex;
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f'
  },
  scrollContent: {
    padding: 16
  },
  header: {
    marginBottom: 24,
    alignItems: 'center'
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e0e0ff',
    letterSpacing: 2
  },
  subtitle: {
    fontSize: 12,
    color: '#8888aa',
    marginTop: 4,
    letterSpacing: 1
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#c0c0e0',
    marginBottom: 12,
    marginTop: 16
  },
  profileSection: {
    backgroundColor: '#12121f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  profileDetails: {
    marginLeft: 16,
    flex: 1
  },
  profileText: {
    color: '#a0a0c0',
    fontSize: 14,
    marginBottom: 4
  },
  querySection: {
    marginBottom: 16
  },
  queryInput: {
    backgroundColor: '#12121f',
    borderRadius: 12,
    padding: 16,
    color: '#e0e0ff',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#2a2a4a'
  },
  queryButton: {
    backgroundColor: '#4a4a8a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12
  },
  queryButtonDisabled: {
    opacity: 0.5
  },
  queryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  resultSection: {
    marginBottom: 16
  },
  sentenceCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6a6aaa'
  },
  sentenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  sentenceType: {
    color: '#8888cc',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  scoreBadge: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600'
  },
  sentenceText: {
    color: '#e0e0ff',
    fontSize: 16,
    lineHeight: 24
  },
  codonCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12
  },
  codonText: {
    color: '#a0a0c0',
    fontSize: 13
  },
  resonanceContainer: {
    marginBottom: 16
  },
  resonanceLabel: {
    color: '#8888aa',
    fontSize: 12,
    marginBottom: 4
  },
  resonanceBar: {
    height: 8,
    backgroundColor: '#2a2a4a',
    borderRadius: 4,
    overflow: 'hidden'
  },
  resonanceFill: {
    height: '100%',
    borderRadius: 4
  },
  resonanceValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'right'
  },
  trajectoryBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12
  },
  trajectoryText: {
    color: '#c0c0e0',
    fontSize: 14,
    fontWeight: '600'
  },
  stepCount: {
    color: '#8888aa',
    fontSize: 12
  },
  treeContainer: {
    marginLeft: 8
  },
  treeNode: {
    flexDirection: 'row',
    marginBottom: 12
  },
  treeConnector: {
    width: 2,
    backgroundColor: '#3a3a6a',
    marginRight: 12
  },
  treeContent: {
    flex: 1,
    backgroundColor: '#12121f',
    borderRadius: 8,
    padding: 12
  },
  treeStep: {
    color: '#8888aa',
    fontSize: 11,
    marginBottom: 2
  },
  treeHexagram: {
    color: '#c0c0e0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4
  },
  treeSentence: {
    color: '#a0a0c0',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8
  },
  w5Indicator: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  w5Label: {
    color: '#8888aa',
    fontSize: 11,
    width: 50
  },
  w5Bar: {
    height: 4,
    backgroundColor: '#4a4a8a',
    borderRadius: 2,
    flex: 1
  },
  altPathCard: {
    flexDirection: 'row',
    backgroundColor: '#12121f',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center'
  },
  altPathRank: {
    color: '#6a6aaa',
    fontSize: 18,
    fontWeight: 'bold',
    width: 40
  },
  altPathInfo: {
    flex: 1
  },
  altPathScore: {
    color: '#c0c0e0',
    fontSize: 14
  },
  altPathMeta: {
    color: '#8888aa',
    fontSize: 12,
    marginTop: 2
  },
  statsCard: {
    backgroundColor: '#12121f',
    borderRadius: 12,
    padding: 16,
    marginTop: 16
  },
  statsTitle: {
    color: '#c0c0e0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8
  },
  statsText: {
    color: '#a0a0c0',
    fontSize: 13,
    marginBottom: 4
  },
  gateBrowser: {
    marginTop: 24
  },
  gateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  gateButton: {
    width: 50,
    height: 50,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4a'
  },
  gateButtonText: {
    color: '#c0c0e0',
    fontSize: 16,
    fontWeight: '600'
  },
  gateVisualizer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12
  },
  gateNumber: {
    color: '#6a6aaa',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8
  },
  hexagramContainer: {
    alignItems: 'center'
  },
  hexLine: {
    height: 4,
    marginVertical: 3,
    borderRadius: 2
  },
  yangLine: {
    backgroundColor: '#e0e0ff'
  },
  yinLine: {
    backgroundColor: '#e0e0ff',
    width: '40%'
  }
});

export default LivingMirrorApp;
