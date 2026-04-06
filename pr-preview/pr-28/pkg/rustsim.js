/* @ts-self-types="./rustsim.d.ts" */

export class DagHandle {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(DagHandle.prototype);
        obj.__wbg_ptr = ptr;
        DagHandleFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DagHandleFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_daghandle_free(ptr, 0);
    }
    /**
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    add(a, b) {
        const ret = wasm.daghandle_add(this.__wbg_ptr, a, b);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0];
    }
    /**
     * @param {number} value
     * @returns {number}
     */
    constant(value) {
        const ret = wasm.daghandle_constant(this.__wbg_ptr, value);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0];
    }
    /**
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    div(a, b) {
        const ret = wasm.daghandle_div(this.__wbg_ptr, a, b);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0];
    }
    /**
     * Evaluate the DAG with null channels (pure math).
     * Returns the values array as a `Float64Array`.
     * @returns {Float64Array}
     */
    evaluate() {
        const ret = wasm.daghandle_evaluate(this.__wbg_ptr);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Get value at a specific node after evaluation.
     * @param {number} node_id
     * @returns {number}
     */
    evaluate_node(node_id) {
        const ret = wasm.daghandle_evaluate_node(this.__wbg_ptr, node_id);
        return ret;
    }
    /**
     * Decode from CBOR bytes.
     * @param {Uint8Array} bytes
     * @returns {DagHandle}
     */
    static from_cbor(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.daghandle_from_cbor(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return DagHandle.__wrap(ret[0]);
    }
    /**
     * @param {string} name
     * @returns {number}
     */
    input(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.daghandle_input(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0];
    }
    /**
     * @returns {boolean}
     */
    is_empty() {
        const ret = wasm.daghandle_is_empty(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    len() {
        const ret = wasm.daghandle_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    mul(a, b) {
        const ret = wasm.daghandle_mul(this.__wbg_ptr, a, b);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0];
    }
    /**
     * @param {number} a
     * @returns {number}
     */
    neg(a) {
        const ret = wasm.daghandle_neg(this.__wbg_ptr, a);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0];
    }
    constructor() {
        const ret = wasm.daghandle_new();
        this.__wbg_ptr = ret >>> 0;
        DagHandleFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {string} name
     * @param {number} src
     * @returns {number}
     */
    output(name, src) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.daghandle_output(this.__wbg_ptr, ptr0, len0, src);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0];
    }
    /**
     * @param {number} base
     * @param {number} exp
     * @returns {number}
     */
    pow(base, exp) {
        const ret = wasm.daghandle_pow(this.__wbg_ptr, base, exp);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0];
    }
    /**
     * @param {string} topic
     * @param {number} src
     * @returns {number}
     */
    publish(topic, src) {
        const ptr0 = passStringToWasm0(topic, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.daghandle_publish(this.__wbg_ptr, ptr0, len0, src);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0];
    }
    /**
     * @param {number} a
     * @returns {number}
     */
    relu(a) {
        const ret = wasm.daghandle_relu(this.__wbg_ptr, a);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0];
    }
    /**
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    sub(a, b) {
        const ret = wasm.daghandle_sub(this.__wbg_ptr, a, b);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0];
    }
    /**
     * @param {string} topic
     * @returns {number}
     */
    subscribe(topic) {
        const ptr0 = passStringToWasm0(topic, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.daghandle_subscribe(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0];
    }
    /**
     * Encode to CBOR bytes.
     * @returns {Uint8Array}
     */
    to_cbor() {
        const ret = wasm.daghandle_to_cbor(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Get a JSON representation of the DAG structure for the UI.
     * @returns {string}
     */
    to_json() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.daghandle_to_json(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
}
if (Symbol.dispose) DagHandle.prototype[Symbol.dispose] = DagHandle.prototype.free;

/**
 * Add a block to a graph. Returns block id.
 * @param {number} graph_id
 * @param {string} block_type
 * @param {string} config_json
 * @returns {number}
 */
export function dataflow_add_block(graph_id, block_type, config_json) {
    const ptr0 = passStringToWasm0(block_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(config_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.dataflow_add_block(graph_id, ptr0, len0, ptr1, len1);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] >>> 0;
}

/**
 * Add a simulated I2C device on the given bus at the given 7-bit address.
 * @param {number} graph_id
 * @param {number} bus
 * @param {number} addr
 * @param {string} name
 */
export function dataflow_add_i2c_device(graph_id, bus, addr, name) {
    const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.dataflow_add_i2c_device(graph_id, bus, addr, ptr0, len0);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * Advance the graph by wall-clock elapsed seconds (realtime mode).
 * Returns snapshot JSON.
 * @param {number} graph_id
 * @param {number} elapsed
 * @returns {string}
 */
export function dataflow_advance(graph_id, elapsed) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ret = wasm.dataflow_advance(graph_id, elapsed);
        var ptr1 = ret[0];
        var len1 = ret[1];
        if (ret[3]) {
            ptr1 = 0; len1 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * List available block types as JSON.
 * @returns {string}
 */
export function dataflow_block_types() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.dataflow_block_types();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Generate a standalone Rust crate from a dataflow graph.
 * Returns JSON: `{ "files": [["path", "content"], ...] }` or error.
 * @param {number} graph_id
 * @param {number} dt
 * @returns {string}
 */
export function dataflow_codegen(graph_id, dt) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ret = wasm.dataflow_codegen(graph_id, dt);
        var ptr1 = ret[0];
        var len1 = ret[1];
        if (ret[3]) {
            ptr1 = 0; len1 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Generate a multi-target workspace from a dataflow graph.
 *
 * `targets_json` is a JSON array of `{ "target": "host"|"rp2040"|"stm32f4"|"esp32c3", "binding": {...} }`.
 * Returns JSON: `[["path", "content"], ...]` or error.
 * @param {number} graph_id
 * @param {number} dt
 * @param {string} targets_json
 * @returns {string}
 */
export function dataflow_codegen_multi(graph_id, dt, targets_json) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(targets_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.dataflow_codegen_multi(graph_id, dt, ptr0, len0);
        var ptr2 = ret[0];
        var len2 = ret[1];
        if (ret[3]) {
            ptr2 = 0; len2 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred3_0 = ptr2;
        deferred3_1 = len2;
        return getStringFromWasm0(ptr2, len2);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}

/**
 * Configure a simulated serial port. Parity: 0=None, 1=Odd, 2=Even.
 * @param {number} graph_id
 * @param {number} port
 * @param {number} baud
 * @param {number} data_bits
 * @param {number} parity
 * @param {number} stop_bits
 */
export function dataflow_configure_serial(graph_id, port, baud, data_bits, parity, stop_bits) {
    const ret = wasm.dataflow_configure_serial(graph_id, port, baud, data_bits, parity, stop_bits);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * Connect an output port to an input port. Returns channel id.
 * @param {number} graph_id
 * @param {number} from_block
 * @param {number} from_port
 * @param {number} to_block
 * @param {number} to_port
 * @returns {number}
 */
export function dataflow_connect(graph_id, from_block, from_port, to_block, to_port) {
    const ret = wasm.dataflow_connect(graph_id, from_block, from_port, to_block, to_port);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] >>> 0;
}

/**
 * Destroy a dataflow graph.
 * @param {number} graph_id
 */
export function dataflow_destroy(graph_id) {
    wasm.dataflow_destroy(graph_id);
}

/**
 * Disconnect a channel.
 * @param {number} graph_id
 * @param {number} channel_id
 */
export function dataflow_disconnect(graph_id, channel_id) {
    const ret = wasm.dataflow_disconnect(graph_id, channel_id);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * Read the last PWM duty written by a simulated PWM block.
 * @param {number} graph_id
 * @param {number} channel
 * @returns {number}
 */
export function dataflow_get_sim_pwm(graph_id, channel) {
    const ret = wasm.dataflow_get_sim_pwm(graph_id, channel);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0];
}

/**
 * Read the 256-byte register map of a simulated I2C device (as JSON array).
 * @param {number} graph_id
 * @param {number} bus
 * @param {number} addr
 * @returns {any}
 */
export function dataflow_i2c_device_registers(graph_id, bus, addr) {
    const ret = wasm.dataflow_i2c_device_registers(graph_id, bus, addr);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Create a new dataflow graph. Returns its id.
 * @param {number} dt
 * @returns {number}
 */
export function dataflow_new(dt) {
    const ret = wasm.dataflow_new(dt);
    return ret >>> 0;
}

/**
 * Remove a block from a graph.
 * @param {number} graph_id
 * @param {number} block_id
 */
export function dataflow_remove_block(graph_id, block_id) {
    const ret = wasm.dataflow_remove_block(graph_id, block_id);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * Remove a simulated I2C device.
 * @param {number} graph_id
 * @param {number} bus
 * @param {number} addr
 */
export function dataflow_remove_i2c_device(graph_id, bus, addr) {
    const ret = wasm.dataflow_remove_i2c_device(graph_id, bus, addr);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * Run a fixed number of ticks (non-realtime batch mode).
 * Returns snapshot JSON.
 * @param {number} graph_id
 * @param {number} steps
 * @param {number} dt
 * @returns {string}
 */
export function dataflow_run(graph_id, steps, dt) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ret = wasm.dataflow_run(graph_id, steps, dt);
        var ptr1 = ret[0];
        var len1 = ret[1];
        if (ret[3]) {
            ptr1 = 0; len1 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * List all configured serial ports as JSON.
 * @param {number} graph_id
 * @returns {any}
 */
export function dataflow_serial_ports(graph_id) {
    const ret = wasm.dataflow_serial_ports(graph_id);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Set a simulated ADC channel voltage.
 * @param {number} graph_id
 * @param {number} channel
 * @param {number} voltage
 */
export function dataflow_set_sim_adc(graph_id, channel, voltage) {
    const ret = wasm.dataflow_set_sim_adc(graph_id, channel, voltage);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * Enable or disable simulation mode for a graph.
 * When enabled, peripheral blocks use SimModel dispatch with simulated peripherals.
 * @param {number} graph_id
 * @param {boolean} enabled
 */
export function dataflow_set_simulation_mode(graph_id, enabled) {
    const ret = wasm.dataflow_set_simulation_mode(graph_id, enabled);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * Set the simulation speed multiplier.
 * @param {number} graph_id
 * @param {number} speed
 */
export function dataflow_set_speed(graph_id, speed) {
    const ret = wasm.dataflow_set_speed(graph_id, speed);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * Get a snapshot of the graph without ticking.
 * @param {number} graph_id
 * @returns {string}
 */
export function dataflow_snapshot(graph_id) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ret = wasm.dataflow_snapshot(graph_id);
        var ptr1 = ret[0];
        var len1 = ret[1];
        if (ret[3]) {
            ptr1 = 0; len1 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Drain data from a simulated TCP send buffer (as JSON array).
 * @param {number} graph_id
 * @param {number} socket_id
 * @returns {any}
 */
export function dataflow_tcp_drain(graph_id, socket_id) {
    const ret = wasm.dataflow_tcp_drain(graph_id, socket_id);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Inject data into a simulated TCP receive buffer.
 * @param {number} graph_id
 * @param {number} socket_id
 * @param {Uint8Array} data
 */
export function dataflow_tcp_inject(graph_id, socket_id, data) {
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.dataflow_tcp_inject(graph_id, socket_id, ptr0, len0);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * Update a block's config by replacing it in-place (preserving channels where ports still match).
 * @param {number} graph_id
 * @param {number} block_id
 * @param {string} block_type
 * @param {string} config_json
 */
export function dataflow_update_block(graph_id, block_id, block_type, config_json) {
    const ptr0 = passStringToWasm0(block_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(config_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.dataflow_update_block(graph_id, block_id, ptr0, len0, ptr1, len1);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * Add a widget to a panel from JSON config.
 * @param {number} panel_id
 * @param {string} config_json
 * @returns {number}
 */
export function panel_add_widget(panel_id, config_json) {
    const ptr0 = passStringToWasm0(config_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.panel_add_widget(panel_id, ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] >>> 0;
}

/**
 * Collect output topic values.
 * @param {number} panel_id
 * @returns {string}
 */
export function panel_collect_outputs(panel_id) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ret = wasm.panel_collect_outputs(panel_id);
        var ptr1 = ret[0];
        var len1 = ret[1];
        if (ret[3]) {
            ptr1 = 0; len1 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Destroy a panel, removing it from storage.
 * @param {number} panel_id
 */
export function panel_destroy(panel_id) {
    wasm.panel_destroy(panel_id);
}

/**
 * Get all current topic values as JSON.
 * @param {number} panel_id
 * @returns {string}
 */
export function panel_get_values(panel_id) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ret = wasm.panel_get_values(panel_id);
        var ptr1 = ret[0];
        var len1 = ret[1];
        if (ret[3]) {
            ptr1 = 0; len1 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Deserialize a PanelModel from JSON, store it, and return its id.
 * @param {string} json
 * @returns {number}
 */
export function panel_load(json) {
    const ptr0 = passStringToWasm0(json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.panel_load(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] >>> 0;
}

/**
 * Merge external values into input topics.
 * @param {number} panel_id
 * @param {string} values_json
 */
export function panel_merge_values(panel_id, values_json) {
    const ptr0 = passStringToWasm0(values_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.panel_merge_values(panel_id, ptr0, len0);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * Create a new empty panel. Returns its id.
 * @param {string} name
 * @returns {number}
 */
export function panel_new(name) {
    const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.panel_new(ptr0, len0);
    return ret >>> 0;
}

/**
 * Remove a widget from a panel.
 * @param {number} panel_id
 * @param {number} widget_id
 * @returns {boolean}
 */
export function panel_remove_widget(panel_id, widget_id) {
    const ret = wasm.panel_remove_widget(panel_id, widget_id);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
}

/**
 * Serialize a panel to JSON.
 * @param {number} panel_id
 * @returns {string}
 */
export function panel_save(panel_id) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ret = wasm.panel_save(panel_id);
        var ptr1 = ret[0];
        var len1 = ret[1];
        if (ret[3]) {
            ptr1 = 0; len1 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Set a topic value from widget interaction.
 * @param {number} panel_id
 * @param {string} topic
 * @param {number} value
 */
export function panel_set_topic(panel_id, topic, value) {
    const ptr0 = passStringToWasm0(topic, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.panel_set_topic(panel_id, ptr0, len0, value);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * JSON snapshot of the full panel.
 * @param {number} panel_id
 * @returns {string}
 */
export function panel_snapshot(panel_id) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ret = wasm.panel_snapshot(panel_id);
        var ptr1 = ret[0];
        var len1 = ret[1];
        if (ret[3]) {
            ptr1 = 0; len1 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Update a widget's config. The original widget id is preserved.
 * @param {number} panel_id
 * @param {number} widget_id
 * @param {string} config_json
 */
export function panel_update_widget(panel_id, widget_id, config_json) {
    const ptr0 = passStringToWasm0(config_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.panel_update_widget(panel_id, widget_id, ptr0, len0);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_81fc77679af83bc6: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./rustsim_bg.js": import0,
    };
}

const DagHandleFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_daghandle_free(ptr >>> 0, 1));

function getArrayF64FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat64ArrayMemory0().subarray(ptr / 8, ptr / 8 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedFloat64ArrayMemory0 = null;
function getFloat64ArrayMemory0() {
    if (cachedFloat64ArrayMemory0 === null || cachedFloat64ArrayMemory0.byteLength === 0) {
        cachedFloat64ArrayMemory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedFloat64ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('rustsim_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
