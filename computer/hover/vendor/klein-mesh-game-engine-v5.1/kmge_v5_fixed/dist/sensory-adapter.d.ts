/**
 * ============================================================
 * SENSORY INPUT ADAPTER — DISEMINER's Eyes
 * Ported from Python + upgraded for structured observation
 *
 * Principle: RAW MEASUREMENT FIRST → relationships second →
 *            interpretation third → AUTOLING names it last.
 *
 * Sight upgrade: returns structured observations instead of
 * a single brightness number. DISEMINER learns from:
 *   { objects, relations, changes, timestamp, frameEmbedding }
 * ============================================================
 */
export interface RawMeasurement {
    /** Raw sensor values before any interpretation */
    values: Record<string, number>;
    source: string;
    timestamp: number;
}
export interface DetectedObject {
    id: string;
    position: {
        x: number;
        y: number;
        z?: number;
    };
    velocity: {
        x: number;
        y: number;
        z?: number;
    };
    appearanceEmbedding: Float32Array;
    confidence: number;
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
export interface DetectedRelation {
    subject: string;
    predicate: string;
    object: string;
    confidence: number;
    frameIndex: number;
}
export interface DetectedChange {
    subject: string;
    property: string;
    before: number | string | boolean;
    after: number | string | boolean;
    delta: number;
    cause?: string;
}
export interface StructuredObservation {
    timestamp: number;
    frameIndex: number;
    frameEmbedding: Float32Array;
    objects: DetectedObject[];
    relations: DetectedRelation[];
    changes: DetectedChange[];
    raw: RawMeasurement;
}
export interface SensoryCalibration {
    smell: {
        scale: number;
        offset: number;
        chemicalMap: Record<string, [number, number, number]>;
    };
    taste: {
        scale: number;
        offset: number;
        propertyWeights: Record<string, number>;
    };
    touch: {
        pressureScale: number;
        tempBaseline: number;
        tempScale: number;
    };
    sight: {
        resolution: [number, number];
        embeddingDim: number;
    };
    hearing: {
        sampleRate: number;
        freqScale: number;
    };
}
export declare class SensoryInputAdapter {
    private calibration;
    constructor(calibration?: Partial<SensoryCalibration>);
    /**
     * SMELL: Convert chemical sensor readings to raw 3D gradient.
     * Downstream systems decide what the axes MEAN.
     */
    smellFromChemicalData(chemicalReadings: Record<string, number>): RawMeasurement;
    /**
     * TASTE: Convert chemical properties to raw alignment score.
     * BUT: preserve all raw properties in the measurement.
     */
    tasteFromChemicalData(substanceData: Record<string, number>): RawMeasurement;
    /**
     * TOUCH: Convert physical sensor readings to raw measurement.
     * Curvature is computed, but raw pressure/temperature preserved.
     */
    touchFromSensorData(sensorData: Record<string, number>): RawMeasurement;
    /**
     * SIGHT — UPGRADED: Returns structured observation, not just brightness.
     *
     * Input: visual data (frame pixels, object detections, state deltas)
     * Output: StructuredObservation with objects, relations, changes.
     *
     * This is where DISEMINER gets its eyes.
     */
    sightFromVisualData(visualData: {
        frameIndex: number;
        pixels?: Uint8Array;
        objects?: Array<{
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            vx?: number;
            vy?: number;
            embedding?: number[];
            confidence?: number;
        }>;
        relations?: Array<{
            subject: string;
            predicate: string;
            object: string;
            confidence?: number;
        }>;
        stateChanges?: Array<{
            subject: string;
            property: string;
            before: number | string | boolean;
            after: number | string | boolean;
            cause?: string;
        }>;
    }): StructuredObservation;
    /**
     * HEARING: Convert audio sensor data to frequency.
     * Raw spectrum preserved, peak frequency computed.
     */
    hearingFromAudioData(audioData: {
        frequency?: number;
        amplitude?: number;
        spectrum?: number[];
    }): RawMeasurement;
    /**
     * Create a complete perception packet from all available sensors.
     * Returns both raw measurements AND structured sight observation.
     */
    createPerceptionFromSensors(inputs: {
        smell?: Record<string, number>;
        taste?: Record<string, number>;
        touch?: Record<string, number>;
        sight?: Parameters<SensoryInputAdapter['sightFromVisualData']>[0];
        hearing?: {
            frequency?: number;
            amplitude?: number;
            spectrum?: number[];
        };
    }): {
        smell?: RawMeasurement;
        taste?: RawMeasurement;
        touch?: RawMeasurement;
        sight?: StructuredObservation;
        hearing?: RawMeasurement;
    };
    private normalizeChemical;
    private hashEmbedding;
    private computeFrameEmbedding;
    private computeBrightness;
}
export default SensoryInputAdapter;
//# sourceMappingURL=sensory-adapter.d.ts.map