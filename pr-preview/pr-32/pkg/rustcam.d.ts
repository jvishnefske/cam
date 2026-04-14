/* tslint:disable */
/* eslint-disable */

export function available_profiles(): string;

export function default_config(machine_type: string): string;

export function preview_stl(data: Uint8Array, config_json: string): string;

export function preview_svg(svg_text: string): string;

export function process_stl(data: Uint8Array, config_json: string): string;

export function process_stl_progress(data: Uint8Array, config_json: string, on_progress: Function): string;

export function process_svg(svg_text: string, config_json: string): string;

export function process_svg_progress(svg_text: string, config_json: string, on_progress: Function): string;

export function sim_moves_stl(data: Uint8Array, config_json: string): string;

export function sim_moves_svg(svg_text: string, config_json: string): string;

export function sketch_add_constraint(kind: string, ids_json: string, value: number, value2: number): string;

export function sketch_add_fixed_point(x: number, y: number): string;

export function sketch_add_point(x: number, y: number): string;

export function sketch_move_point(id: number, x: number, y: number): void;

export function sketch_pump(): string;

export function sketch_remove_constraint(id: number): void;

export function sketch_remove_point(id: number): void;

export function sketch_reset(): void;

export function sketch_set_fixed(id: number, fixed: boolean): void;

export function sketch_snapshot(): string;

export function sketch_solve(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly available_profiles: () => [number, number];
    readonly default_config: (a: number, b: number) => [number, number];
    readonly preview_stl: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly preview_svg: (a: number, b: number) => [number, number, number, number];
    readonly process_stl: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly process_stl_progress: (a: number, b: number, c: number, d: number, e: any) => [number, number, number, number];
    readonly process_svg: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly process_svg_progress: (a: number, b: number, c: number, d: number, e: any) => [number, number, number, number];
    readonly sim_moves_stl: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly sim_moves_svg: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly sketch_add_constraint: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
    readonly sketch_add_fixed_point: (a: number, b: number) => [number, number];
    readonly sketch_add_point: (a: number, b: number) => [number, number];
    readonly sketch_move_point: (a: number, b: number, c: number) => void;
    readonly sketch_pump: () => [number, number, number, number];
    readonly sketch_remove_constraint: (a: number) => void;
    readonly sketch_remove_point: (a: number) => void;
    readonly sketch_reset: () => void;
    readonly sketch_set_fixed: (a: number, b: number) => void;
    readonly sketch_snapshot: () => [number, number, number, number];
    readonly sketch_solve: () => [number, number, number, number];
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
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
