/* tslint:disable */
/* eslint-disable */
/**
 * A directed connection from one output port to one input port.
 */
export interface Channel {
    id: ChannelId;
    from_block: BlockId;
    from_port: number;
    to_block: BlockId;
    to_port: number;
}

/**
 * A named field in a message schema.
 */
export interface MessageField {
    name: string;
    field_type: FieldType;
}

/**
 * A value flowing through a channel.
 */
export type Value = { type: "Float"; data: number } | { type: "Bytes"; data: number[] } | { type: "Text"; data: string } | { type: "Series"; data: number[] } | { type: "Message"; data: MessageData };

/**
 * Metadata for a single port.
 */
export interface PortDef {
    name: string;
    kind: PortKind;
}

/**
 * Opaque block identifier.
 */
export type BlockId = number;

/**
 * Opaque channel identifier.
 */
export type ChannelId = number;

/**
 * Primitive field types for message schemas.
 */
export type FieldType = "F32" | "F64" | "U8" | "U16" | "U32" | "I32" | "Bool";

/**
 * Runtime message data: flat f64 fields (bools as 0.0/1.0, ints cast to f64).
 */
export interface MessageData {
    schema_name: string;
    fields: [string, number][];
}

/**
 * Schema definition for a structured message type.
 */
export interface MessageSchema {
    name: string;
    fields: MessageField[];
}

/**
 * Snapshot of one block for serialization to the frontend.
 */
export interface BlockSnapshot {
    id: number;
    block_type: string;
    name: string;
    inputs: PortDef[];
    outputs: PortDef[];
    config: Value;
    /**
     * Last output values (one per output port).
     */
    output_values: (Value | undefined)[];
    /**
     * Optional target MCU assignment for distributed codegen.
     * When None, the block runs on all targets.
     */
    target?: TargetFamily;
    /**
     * Custom codegen output from blocks implementing the `Codegen` trait.
     * When present, emit.rs uses this instead of built-in code generation.
     */
    custom_codegen?: string;
}

/**
 * Snapshot of the entire graph.
 */
export interface GraphSnapshot {
    blocks: BlockSnapshot[];
    channels: Channel[];
    tick_count: number;
    time: number;
}

/**
 * Target MCU family.
 */
export type TargetFamily = "Host" | "Rp2040" | "Stm32f4" | "Esp32c3" | "Stm32g0b1";

/**
 * The kinds of data that can flow through a port.
 */
export type PortKind = "Float" | "Bytes" | "Text" | "Series" | "Any" | { Message: MessageSchema };

export interface AdcConfig {
    channel: number;
    resolution_bits: number;
}

export interface BlockTypeInfo {
    block_type: string;
    name: string;
    category: string;
}

export interface ConstantConfig {
    value: number;
}

export interface EncoderConfig {
    channel: number;
}

export interface FieldCondition {
    field: string;
    op: CompareOp;
    value: number;
}

export interface FunctionConfig {
    op: FunctionOp;
    param1?: number;
    param2?: number;
}

export interface GpioInConfig {
    pin: number;
}

export interface GpioOutConfig {
    pin: number;
}

export interface PlotConfig {
    /**
     * Maximum number of samples to keep.
     */
    max_samples?: number;
}

export interface PubSubConfig {
    topic?: string;
    port_kind?: "Float" | "Bytes" | "Text" | "Series" | "Any";
}

export interface PwmConfig {
    channel: number;
    frequency_hz: number;
}

export interface Ssd1306DisplayConfig {
    i2c_bus?: number;
    address?: number;
}

export interface StateMachineConfig {
    states?: string[];
    initial?: string;
    transitions?: TransitionConfig[];
    input_topics?: TopicBinding[];
    output_topics?: TopicBinding[];
}

export interface Tmc2209StallGuardConfig {
    uart_port?: number;
    uart_addr?: number;
    threshold?: number;
}

export interface Tmc2209StepperConfig {
    uart_port?: number;
    uart_addr?: number;
    steps_per_rev?: number;
    microsteps?: number;
}

export interface TopicBinding {
    topic: string;
    schema: { name: string; fields: Array<{ name: string; field_type: string }> };
}

export interface TransitionAction {
    topic: string;
    message: [string, number][];
}

export interface TransitionConfig {
    from: string;
    to: string;
    guard: TransitionGuard;
    actions?: TransitionAction[];
}

export interface UartRxConfig {
    port: number;
    baud: number;
}

export interface UartTxConfig {
    port: number;
    baud: number;
}

export interface UdpConfig {
    address: string;
}

export type CompareOp = "Eq" | "Ne" | "Gt" | "Lt" | "Ge" | "Le";

export type FunctionOp = "Gain" | "Add" | "Multiply" | "Clamp";

export type TransitionGuard = { type: "Topic"; topic: string; condition?: FieldCondition | undefined } | { type: "Unconditional" } | { type: "GuardPort"; port: number };


export class DagHandle {
    free(): void;
    [Symbol.dispose](): void;
    add(a: number, b: number): number;
    constant(value: number): number;
    div(a: number, b: number): number;
    /**
     * Evaluate the DAG with null channels (pure math).
     * Returns the values array as a `Float64Array`.
     */
    evaluate(): Float64Array;
    /**
     * Get value at a specific node after evaluation.
     */
    evaluate_node(node_id: number): number;
    /**
     * Decode from CBOR bytes.
     */
    static from_cbor(bytes: Uint8Array): DagHandle;
    input(name: string): number;
    is_empty(): boolean;
    len(): number;
    mul(a: number, b: number): number;
    neg(a: number): number;
    constructor();
    output(name: string, src: number): number;
    pow(base: number, exp: number): number;
    publish(topic: string, src: number): number;
    relu(a: number): number;
    sub(a: number, b: number): number;
    subscribe(topic: string): number;
    /**
     * Encode to CBOR bytes.
     */
    to_cbor(): Uint8Array;
    /**
     * Get a JSON representation of the DAG structure for the UI.
     */
    to_json(): string;
}

/**
 * Add a block to a graph. Returns block id.
 */
export function dataflow_add_block(graph_id: number, block_type: string, config_json: string): number;

/**
 * Add a simulated I2C device on the given bus at the given 7-bit address.
 */
export function dataflow_add_i2c_device(graph_id: number, bus: number, addr: number, name: string): void;

/**
 * Advance the graph by wall-clock elapsed seconds (realtime mode).
 * Returns snapshot as a typed JS object.
 */
export function dataflow_advance(graph_id: number, elapsed: number): any;

/**
 * List available block types as a typed JS array.
 */
export function dataflow_block_types(): any;

/**
 * Generate a standalone Rust crate from a dataflow graph.
 * Returns JSON: `{ "files": [["path", "content"], ...] }` or error.
 */
export function dataflow_codegen(graph_id: number, dt: number): string;

/**
 * Generate a multi-target workspace from a dataflow graph.
 *
 * `targets_json` is a JSON array of `{ "target": "host"|"rp2040"|"stm32f4"|"esp32c3", "binding": {...} }`.
 * Returns JSON: `[["path", "content"], ...]` or error.
 */
export function dataflow_codegen_multi(graph_id: number, dt: number, targets_json: string): string;

/**
 * Configure a simulated serial port. Parity: 0=None, 1=Odd, 2=Even.
 */
export function dataflow_configure_serial(graph_id: number, port: number, baud: number, data_bits: number, parity: number, stop_bits: number): void;

/**
 * Connect an output port to an input port. Returns channel id.
 */
export function dataflow_connect(graph_id: number, from_block: number, from_port: number, to_block: number, to_port: number): number;

/**
 * Destroy a dataflow graph.
 */
export function dataflow_destroy(graph_id: number): void;

/**
 * Disconnect a channel.
 */
export function dataflow_disconnect(graph_id: number, channel_id: number): void;

/**
 * Read the last PWM duty written by a simulated PWM block.
 */
export function dataflow_get_sim_pwm(graph_id: number, channel: number): number;

/**
 * Read the 256-byte register map of a simulated I2C device (as JSON array).
 */
export function dataflow_i2c_device_registers(graph_id: number, bus: number, addr: number): any;

/**
 * Create a new dataflow graph. Returns its id.
 */
export function dataflow_new(dt: number): number;

/**
 * Remove a block from a graph.
 */
export function dataflow_remove_block(graph_id: number, block_id: number): void;

/**
 * Remove a simulated I2C device.
 */
export function dataflow_remove_i2c_device(graph_id: number, bus: number, addr: number): void;

/**
 * Run a fixed number of ticks (non-realtime batch mode).
 * Returns snapshot as a typed JS object.
 */
export function dataflow_run(graph_id: number, steps: number, dt: number): any;

/**
 * List all configured serial ports as JSON.
 */
export function dataflow_serial_ports(graph_id: number): any;

/**
 * Set a simulated ADC channel voltage.
 */
export function dataflow_set_sim_adc(graph_id: number, channel: number, voltage: number): void;

/**
 * Enable or disable simulation mode for a graph.
 * When enabled, peripheral blocks use SimModel dispatch with simulated peripherals.
 */
export function dataflow_set_simulation_mode(graph_id: number, enabled: boolean): void;

/**
 * Set the simulation speed multiplier.
 */
export function dataflow_set_speed(graph_id: number, speed: number): void;

/**
 * Get a snapshot of the graph without ticking.
 */
export function dataflow_snapshot(graph_id: number): any;

/**
 * Drain data from a simulated TCP send buffer (as JSON array).
 */
export function dataflow_tcp_drain(graph_id: number, socket_id: number): any;

/**
 * Inject data into a simulated TCP receive buffer.
 */
export function dataflow_tcp_inject(graph_id: number, socket_id: number, data: Uint8Array): void;

/**
 * Update a block's config by replacing it in-place (preserving channels where ports still match).
 */
export function dataflow_update_block(graph_id: number, block_id: number, block_type: string, config_json: string): void;

/**
 * Validate whether a connection between two ports is valid.
 * Returns empty string on success, or an error message on failure.
 */
export function dataflow_validate_connection(graph_id: number, from_block: number, from_port: number, to_block: number, to_port: number): string;

/**
 * Add a widget to a panel from JSON config.
 */
export function panel_add_widget(panel_id: number, config_json: string): number;

/**
 * Collect output topic values.
 */
export function panel_collect_outputs(panel_id: number): string;

/**
 * Destroy a panel, removing it from storage.
 */
export function panel_destroy(panel_id: number): void;

/**
 * Get all current topic values as JSON.
 */
export function panel_get_values(panel_id: number): string;

/**
 * Deserialize a PanelModel from JSON, store it, and return its id.
 */
export function panel_load(json: string): number;

/**
 * Merge external values into input topics.
 */
export function panel_merge_values(panel_id: number, values_json: string): void;

/**
 * Create a new empty panel. Returns its id.
 */
export function panel_new(name: string): number;

/**
 * Remove a widget from a panel.
 */
export function panel_remove_widget(panel_id: number, widget_id: number): boolean;

/**
 * Serialize a panel to JSON.
 */
export function panel_save(panel_id: number): string;

/**
 * Set a topic value from widget interaction.
 */
export function panel_set_topic(panel_id: number, topic: string, value: number): void;

/**
 * JSON snapshot of the full panel.
 */
export function panel_snapshot(panel_id: number): string;

/**
 * Update a widget's config. The original widget id is preserved.
 */
export function panel_update_widget(panel_id: number, widget_id: number, config_json: string): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_daghandle_free: (a: number, b: number) => void;
    readonly daghandle_add: (a: number, b: number, c: number) => [number, number, number];
    readonly daghandle_constant: (a: number, b: number) => [number, number, number];
    readonly daghandle_div: (a: number, b: number, c: number) => [number, number, number];
    readonly daghandle_evaluate: (a: number) => [number, number];
    readonly daghandle_evaluate_node: (a: number, b: number) => number;
    readonly daghandle_from_cbor: (a: number, b: number) => [number, number, number];
    readonly daghandle_input: (a: number, b: number, c: number) => [number, number, number];
    readonly daghandle_is_empty: (a: number) => number;
    readonly daghandle_len: (a: number) => number;
    readonly daghandle_mul: (a: number, b: number, c: number) => [number, number, number];
    readonly daghandle_neg: (a: number, b: number) => [number, number, number];
    readonly daghandle_new: () => number;
    readonly daghandle_output: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly daghandle_pow: (a: number, b: number, c: number) => [number, number, number];
    readonly daghandle_publish: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly daghandle_relu: (a: number, b: number) => [number, number, number];
    readonly daghandle_sub: (a: number, b: number, c: number) => [number, number, number];
    readonly daghandle_subscribe: (a: number, b: number, c: number) => [number, number, number];
    readonly daghandle_to_cbor: (a: number) => [number, number];
    readonly daghandle_to_json: (a: number) => [number, number, number, number];
    readonly dataflow_add_block: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly dataflow_add_i2c_device: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly dataflow_advance: (a: number, b: number) => [number, number, number];
    readonly dataflow_block_types: () => any;
    readonly dataflow_codegen: (a: number, b: number) => [number, number, number, number];
    readonly dataflow_codegen_multi: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly dataflow_configure_serial: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly dataflow_connect: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly dataflow_destroy: (a: number) => void;
    readonly dataflow_disconnect: (a: number, b: number) => [number, number];
    readonly dataflow_get_sim_pwm: (a: number, b: number) => [number, number, number];
    readonly dataflow_i2c_device_registers: (a: number, b: number, c: number) => [number, number, number];
    readonly dataflow_new: (a: number) => number;
    readonly dataflow_remove_block: (a: number, b: number) => [number, number];
    readonly dataflow_remove_i2c_device: (a: number, b: number, c: number) => [number, number];
    readonly dataflow_run: (a: number, b: number, c: number) => [number, number, number];
    readonly dataflow_serial_ports: (a: number) => [number, number, number];
    readonly dataflow_set_sim_adc: (a: number, b: number, c: number) => [number, number];
    readonly dataflow_set_simulation_mode: (a: number, b: number) => [number, number];
    readonly dataflow_set_speed: (a: number, b: number) => [number, number];
    readonly dataflow_snapshot: (a: number) => [number, number, number];
    readonly dataflow_tcp_drain: (a: number, b: number) => [number, number, number];
    readonly dataflow_tcp_inject: (a: number, b: number, c: number, d: number) => [number, number];
    readonly dataflow_update_block: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly dataflow_validate_connection: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly panel_add_widget: (a: number, b: number, c: number) => [number, number, number];
    readonly panel_collect_outputs: (a: number) => [number, number, number, number];
    readonly panel_destroy: (a: number) => void;
    readonly panel_get_values: (a: number) => [number, number, number, number];
    readonly panel_load: (a: number, b: number) => [number, number, number];
    readonly panel_merge_values: (a: number, b: number, c: number) => [number, number];
    readonly panel_new: (a: number, b: number) => number;
    readonly panel_remove_widget: (a: number, b: number) => [number, number, number];
    readonly panel_save: (a: number) => [number, number, number, number];
    readonly panel_set_topic: (a: number, b: number, c: number, d: number) => [number, number];
    readonly panel_update_widget: (a: number, b: number, c: number, d: number) => [number, number];
    readonly panel_snapshot: (a: number) => [number, number, number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
