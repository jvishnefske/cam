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
    /**
     * Whether this block is a delay element (z⁻¹) that breaks feedback cycles.
     */
    is_delay?: boolean;
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

export interface EncoderConfig {
    channel: number;
}

export interface FieldCondition {
    field: string;
    op: CompareOp;
    value: number;
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

export interface RegisterConfig {
    initial_value?: number;
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

export type TransitionGuard = { type: "Topic"; topic: string; condition?: FieldCondition | undefined } | { type: "Unconditional" } | { type: "GuardPort"; port: number };


export class WasmDagHandle {
    free(): void;
    [Symbol.dispose](): void;
    add(a: number, b: number): number;
    constant(value: number): number;
    div(a: number, b: number): number;
    evaluate(): Float64Array;
    evaluate_node(node_id: number): number;
    static from_cbor(bytes: Uint8Array): WasmDagHandle;
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
    to_cbor(): Uint8Array;
    to_json(): string;
}

export function dataflow_add_block(graph_id: number, block_type: string, config_json: string): number;

export function dataflow_add_i2c_device(graph_id: number, bus: number, addr: number, name: string): void;

export function dataflow_advance(graph_id: number, elapsed: number): any;

export function dataflow_block_types(): any;

export function dataflow_codegen(graph_id: number, dt: number): string;

export function dataflow_codegen_multi(graph_id: number, dt: number, targets_json: string): string;

export function dataflow_configure_serial(graph_id: number, port: number, baud: number, data_bits: number, parity: number, stop_bits: number): void;

export function dataflow_connect(graph_id: number, from_block: number, from_port: number, to_block: number, to_port: number): number;

export function dataflow_destroy(graph_id: number): void;

export function dataflow_disconnect(graph_id: number, channel_id: number): void;

export function dataflow_function_defs(): any;

export function dataflow_get_sim_pwm(graph_id: number, channel: number): number;

export function dataflow_new(dt: number): number;

export function dataflow_remove_block(graph_id: number, block_id: number): void;

export function dataflow_remove_i2c_device(graph_id: number, bus: number, addr: number): void;

export function dataflow_run(graph_id: number, steps: number, dt: number): any;

export function dataflow_set_sim_adc(graph_id: number, channel: number, voltage: number): void;

export function dataflow_set_simulation_mode(graph_id: number, enabled: boolean): void;

export function dataflow_set_speed(graph_id: number, speed: number): void;

export function dataflow_snapshot(graph_id: number): any;

export function dataflow_tcp_inject(graph_id: number, socket_id: number, data: Uint8Array): void;

export function dataflow_update_block(graph_id: number, block_id: number, block_type: string, config_json: string): void;

export function mcu_definition(family: string): any;

export function mcu_families(): any;

export function mcu_peripherals(family: string): any;

export function mcu_pins(family: string): any;

export function panel_add_widget(panel_id: number, config_json: string): number;

export function panel_collect_outputs(panel_id: number): string;

export function panel_destroy(panel_id: number): void;

export function panel_get_values(panel_id: number): string;

export function panel_load(json: string): number;

export function panel_merge_values(panel_id: number, values_json: string): void;

export function panel_new(name: string): number;

export function panel_remove_widget(panel_id: number, widget_id: number): boolean;

export function panel_save(panel_id: number): string;

export function panel_set_topic(panel_id: number, topic: string, value: number): void;

export function panel_snapshot(panel_id: number): string;

export function panel_update_widget(panel_id: number, widget_id: number, config_json: string): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_wasmdaghandle_free: (a: number, b: number) => void;
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
    readonly dataflow_function_defs: () => [number, number, number];
    readonly dataflow_get_sim_pwm: (a: number, b: number) => [number, number, number];
    readonly dataflow_new: (a: number) => number;
    readonly dataflow_remove_block: (a: number, b: number) => [number, number];
    readonly dataflow_remove_i2c_device: (a: number, b: number, c: number) => [number, number];
    readonly dataflow_run: (a: number, b: number, c: number) => [number, number, number];
    readonly dataflow_set_sim_adc: (a: number, b: number, c: number) => [number, number];
    readonly dataflow_set_simulation_mode: (a: number, b: number) => [number, number];
    readonly dataflow_set_speed: (a: number, b: number) => [number, number];
    readonly dataflow_snapshot: (a: number) => [number, number, number];
    readonly dataflow_tcp_inject: (a: number, b: number, c: number, d: number) => [number, number];
    readonly dataflow_update_block: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly mcu_definition: (a: number, b: number) => [number, number, number];
    readonly mcu_families: () => any;
    readonly mcu_peripherals: (a: number, b: number) => [number, number, number];
    readonly mcu_pins: (a: number, b: number) => [number, number, number];
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
    readonly wasmdaghandle_add: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmdaghandle_constant: (a: number, b: number) => [number, number, number];
    readonly wasmdaghandle_div: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmdaghandle_evaluate: (a: number) => [number, number];
    readonly wasmdaghandle_evaluate_node: (a: number, b: number) => number;
    readonly wasmdaghandle_from_cbor: (a: number, b: number) => [number, number, number];
    readonly wasmdaghandle_input: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmdaghandle_is_empty: (a: number) => number;
    readonly wasmdaghandle_len: (a: number) => number;
    readonly wasmdaghandle_mul: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmdaghandle_neg: (a: number, b: number) => [number, number, number];
    readonly wasmdaghandle_new: () => number;
    readonly wasmdaghandle_output: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly wasmdaghandle_pow: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmdaghandle_publish: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly wasmdaghandle_relu: (a: number, b: number) => [number, number, number];
    readonly wasmdaghandle_sub: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmdaghandle_subscribe: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmdaghandle_to_cbor: (a: number) => [number, number];
    readonly wasmdaghandle_to_json: (a: number) => [number, number];
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
